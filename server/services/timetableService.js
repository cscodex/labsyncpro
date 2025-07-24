const { query } = require('../config/database');

class TimetableService {
  /**
   * Get all timetable versions
   * @returns {Promise<Array>} List of timetable versions
   */
  static async getTimetableVersions() {
    try {
      const result = await query(`
        SELECT 
          id, version_number, version_name, description,
          effective_from, effective_until, is_active,
          created_at, updated_at
        FROM timetable_versions
        ORDER BY effective_from DESC, created_at DESC
      `);

      return result.rows;
    } catch (error) {
      console.error('Failed to get timetable versions:', error);
      throw error;
    }
  }

  /**
   * Get active timetable version for a specific date
   * @param {Date} targetDate - Target date (defaults to current date)
   * @returns {Promise<Object|null>} Active timetable version
   */
  static async getActiveTimetableVersion(targetDate = new Date()) {
    try {
      const result = await query(`
        SELECT get_active_timetable_version($1) as version_id
      `, [targetDate.toISOString().split('T')[0]]);

      if (!result.rows[0].version_id) {
        return null;
      }

      const versionResult = await query(`
        SELECT 
          id, version_number, version_name, description,
          effective_from, effective_until, is_active,
          created_at, updated_at
        FROM timetable_versions
        WHERE id = $1
      `, [result.rows[0].version_id]);

      return versionResult.rows[0] || null;
    } catch (error) {
      console.error('Failed to get active timetable version:', error);
      throw error;
    }
  }

  /**
   * Create a new timetable version with enhanced version control
   * @param {Object} versionData - Version data
   * @param {string} versionData.versionName - Version name
   * @param {string} versionData.description - Version description
   * @param {Date} versionData.effectiveFrom - Effective from date
   * @param {string} versionData.createdBy - User ID who created the version
   * @param {string} versionData.copyFromVersion - Version ID to copy from (optional)
   * @param {boolean} versionData.copySchedules - Whether to copy existing schedules (optional)
   * @returns {Promise<Object>} Created version with migration details
   */
  static async createTimetableVersion(versionData) {
    const client = await query.connect();

    try {
      await client.query('BEGIN');

      const {
        versionName,
        description,
        effectiveFrom,
        createdBy,
        copyFromVersion = null,
        copySchedules = false
      } = versionData;

      // Create the new version
      const result = await client.query(`
        SELECT create_timetable_version($1, $2, $3, $4, $5) as version_id
      `, [versionName, description, effectiveFrom, createdBy, copyFromVersion]);

      const versionId = result.rows[0].version_id;

      // If copying schedules and effective date is in the future, migrate future schedules
      if (copySchedules && copyFromVersion && new Date(effectiveFrom) > new Date()) {
        await this.migrateFutureSchedules(client, copyFromVersion, versionId, effectiveFrom);
      }

      // Get the created version with details
      const versionResult = await client.query(`
        SELECT
          id, version_number, version_name, description,
          effective_from, effective_until, is_active,
          created_at, updated_at
        FROM timetable_versions
        WHERE id = $1
      `, [versionId]);

      // Get migration summary
      const migrationSummary = await this.getVersionMigrationSummary(client, versionId);

      await client.query('COMMIT');

      return {
        version: versionResult.rows[0],
        migration: migrationSummary
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Failed to create timetable version:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Migrate future schedules to new timetable version
   * @param {Object} client - Database client
   * @param {string} fromVersionId - Source version ID
   * @param {string} toVersionId - Target version ID
   * @param {Date} effectiveFrom - Effective from date
   */
  static async migrateFutureSchedules(client, fromVersionId, toVersionId, effectiveFrom) {
    try {
      // Get schedules that need to be migrated (future schedules)
      const schedulesToMigrate = await client.query(`
        SELECT s.*, p.period_number
        FROM timetable_schedules s
        JOIN periods p ON s.period_id = p.id
        WHERE s.timetable_version_id = $1
          AND s.schedule_date >= $2
          AND s.status = 'scheduled'
      `, [fromVersionId, effectiveFrom]);

      // Get period mapping between versions
      const periodMapping = await this.getPeriodMapping(client, fromVersionId, toVersionId);

      // Migrate each schedule
      for (const schedule of schedulesToMigrate.rows) {
        const newPeriodId = periodMapping[schedule.period_number];

        if (newPeriodId) {
          // Create new schedule in the new version
          await client.query(`
            INSERT INTO timetable_schedules (
              timetable_version_id, period_id, session_title, session_type,
              session_description, schedule_date, lab_id, room_name,
              instructor_id, instructor_name, class_id, group_id,
              student_count, max_capacity, color_code, notes, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          `, [
            toVersionId, newPeriodId, schedule.session_title, schedule.session_type,
            schedule.session_description, schedule.schedule_date, schedule.lab_id,
            schedule.room_name, schedule.instructor_id, schedule.instructor_name,
            schedule.class_id, schedule.group_id, schedule.student_count,
            schedule.max_capacity, schedule.color_code, schedule.notes, schedule.created_by
          ]);

          // Mark old schedule as migrated
          await client.query(`
            UPDATE timetable_schedules
            SET status = 'migrated',
                notes = COALESCE(notes, '') || ' [Migrated to new timetable version]'
            WHERE id = $1
          `, [schedule.id]);
        }
      }
    } catch (error) {
      console.error('Failed to migrate future schedules:', error);
      throw error;
    }
  }

  /**
   * Get period mapping between two timetable versions
   * @param {Object} client - Database client
   * @param {string} fromVersionId - Source version ID
   * @param {string} toVersionId - Target version ID
   * @returns {Promise<Object>} Period mapping object
   */
  static async getPeriodMapping(client, fromVersionId, toVersionId) {
    try {
      const fromPeriods = await client.query(`
        SELECT id, period_number FROM periods
        WHERE timetable_version_id = $1
        ORDER BY period_number
      `, [fromVersionId]);

      const toPeriods = await client.query(`
        SELECT id, period_number FROM periods
        WHERE timetable_version_id = $1
        ORDER BY period_number
      `, [toVersionId]);

      const mapping = {};

      // Create mapping based on period numbers
      for (const fromPeriod of fromPeriods.rows) {
        const matchingToPeriod = toPeriods.rows.find(
          p => p.period_number === fromPeriod.period_number
        );

        if (matchingToPeriod) {
          mapping[fromPeriod.period_number] = matchingToPeriod.id;
        }
      }

      return mapping;
    } catch (error) {
      console.error('Failed to get period mapping:', error);
      throw error;
    }
  }

  /**
   * Get version migration summary
   * @param {Object} client - Database client
   * @param {string} versionId - Version ID
   * @returns {Promise<Object>} Migration summary
   */
  static async getVersionMigrationSummary(client, versionId) {
    try {
      const periodsResult = await client.query(`
        SELECT COUNT(*) as period_count FROM periods
        WHERE timetable_version_id = $1
      `, [versionId]);

      const schedulesResult = await client.query(`
        SELECT COUNT(*) as schedule_count FROM timetable_schedules
        WHERE timetable_version_id = $1
      `, [versionId]);

      return {
        periodsCreated: parseInt(periodsResult.rows[0].period_count),
        schedulesMigrated: parseInt(schedulesResult.rows[0].schedule_count),
        migrationDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get migration summary:', error);
      return { periodsCreated: 0, schedulesMigrated: 0, migrationDate: new Date().toISOString() };
    }
  }

  /**
   * Get periods for a timetable version
   * @param {string} versionId - Timetable version ID
   * @returns {Promise<Array>} List of periods
   */
  static async getPeriodsForVersion(versionId) {
    try {
      const result = await query(`
        SELECT 
          id, period_number, period_name, start_time, end_time,
          duration_minutes, is_break, break_duration_minutes,
          display_order, is_active
        FROM periods
        WHERE timetable_version_id = $1
        ORDER BY display_order, period_number
      `, [versionId]);

      return result.rows;
    } catch (error) {
      console.error('Failed to get periods for version:', error);
      throw error;
    }
  }

  /**
   * Update periods for a timetable version
   * @param {string} versionId - Timetable version ID
   * @param {Array} periods - Array of period data
   * @returns {Promise<Array>} Updated periods
   */
  static async updatePeriodsForVersion(versionId, periods) {
    const client = await query.connect();
    
    try {
      await client.query('BEGIN');

      // Delete existing periods
      await client.query(`
        DELETE FROM periods WHERE timetable_version_id = $1
      `, [versionId]);

      // Insert new periods
      const updatedPeriods = [];
      for (const period of periods) {
        const result = await client.query(`
          INSERT INTO periods (
            timetable_version_id, period_number, period_name,
            start_time, end_time, is_break, break_duration_minutes,
            display_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `, [
          versionId,
          period.periodNumber,
          period.periodName,
          period.startTime,
          period.endTime,
          period.isBreak || false,
          period.breakDurationMinutes || 0,
          period.displayOrder
        ]);

        updatedPeriods.push(result.rows[0]);
      }

      await client.query('COMMIT');
      return updatedPeriods;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Failed to update periods:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get timetable schedules for a date range
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Array>} List of schedules
   */
  static async getTimetableSchedules(filters = {}) {
    try {
      const {
        startDate,
        endDate,
        labId = null,
        instructorId = null,
        classId = null,
        groupId = null
      } = filters;

      let whereClause = '1=1';
      const queryParams = [];
      let paramIndex = 1;

      if (startDate) {
        whereClause += ` AND s.schedule_date >= $${paramIndex}`;
        queryParams.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        whereClause += ` AND s.schedule_date <= $${paramIndex}`;
        queryParams.push(endDate);
        paramIndex++;
      }

      if (labId) {
        whereClause += ` AND s.lab_id = $${paramIndex}`;
        queryParams.push(labId);
        paramIndex++;
      }

      if (instructorId) {
        whereClause += ` AND s.instructor_id = $${paramIndex}`;
        queryParams.push(instructorId);
        paramIndex++;
      }

      if (classId) {
        whereClause += ` AND s.class_id = $${paramIndex}`;
        queryParams.push(classId);
        paramIndex++;
      }

      if (groupId) {
        whereClause += ` AND s.group_id = $${paramIndex}`;
        queryParams.push(groupId);
        paramIndex++;
      }

      const result = await query(`
        SELECT 
          s.id,
          tv.version_number,
          tv.version_name,
          p.period_number,
          p.period_name,
          p.start_time,
          p.end_time,
          s.schedule_date,
          s.session_title,
          s.session_type,
          s.session_description,
          COALESCE(l.name, s.room_name) as lab_name,
          COALESCE(u.first_name || ' ' || u.last_name, s.instructor_name) as instructor_name,
          c.name as class_name,
          g.name as group_name,
          s.student_count,
          s.max_capacity,
          s.status,
          s.color_code,
          s.notes,
          s.created_at,
          s.updated_at
        FROM timetable_schedules s
        JOIN timetable_versions tv ON s.timetable_version_id = tv.id
        JOIN periods p ON s.period_id = p.id
        LEFT JOIN labs l ON s.lab_id = l.id
        LEFT JOIN users u ON s.instructor_id = u.id
        LEFT JOIN classes c ON s.class_id = c.id
        LEFT JOIN groups g ON s.group_id = g.id
        WHERE ${whereClause}
          AND tv.effective_from <= s.schedule_date
          AND (tv.effective_until IS NULL OR tv.effective_until >= s.schedule_date)
        ORDER BY s.schedule_date, p.display_order
      `, queryParams);

      return result.rows;
    } catch (error) {
      console.error('Failed to get timetable schedules:', error);
      throw error;
    }
  }

  /**
   * Create a new schedule entry
   * @param {Object} scheduleData - Schedule data
   * @returns {Promise<Object>} Created schedule
   */
  static async createSchedule(scheduleData) {
    try {
      const {
        sessionTitle,
        sessionType = 'lecture',
        sessionDescription,
        scheduleDate,
        periodId,
        labId,
        roomName,
        instructorId,
        instructorName,
        classId,
        groupId,
        studentCount = 0,
        maxCapacity,
        colorCode = '#3B82F6',
        notes,
        createdBy
      } = scheduleData;

      // Get the appropriate timetable version for the schedule date
      const versionResult = await query(`
        SELECT get_active_timetable_version($1) as version_id
      `, [scheduleDate]);

      const versionId = versionResult.rows[0].version_id;
      if (!versionId) {
        throw new Error('No active timetable version found for the specified date');
      }

      const result = await query(`
        INSERT INTO timetable_schedules (
          timetable_version_id, period_id, session_title, session_type,
          session_description, schedule_date, lab_id, room_name,
          instructor_id, instructor_name, class_id, group_id,
          student_count, max_capacity, color_code, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `, [
        versionId, periodId, sessionTitle, sessionType, sessionDescription,
        scheduleDate, labId, roomName, instructorId, instructorName,
        classId, groupId, studentCount, maxCapacity, colorCode, notes, createdBy
      ]);

      // Check for conflicts
      const conflicts = await query(`
        SELECT * FROM detect_schedule_conflicts($1)
      `, [result.rows[0].id]);

      if (conflicts.rows.length > 0) {
        // Log conflicts but don't prevent creation
        for (const conflict of conflicts.rows) {
          await query(`
            INSERT INTO timetable_conflicts (
              schedule_id_1, schedule_id_2, conflict_type, conflict_description
            ) VALUES ($1, $1, $2, $3)
          `, [result.rows[0].id, conflict.conflict_type, conflict.description]);
        }
      }

      return {
        schedule: result.rows[0],
        conflicts: conflicts.rows
      };
    } catch (error) {
      console.error('Failed to create schedule:', error);
      throw error;
    }
  }

  /**
   * Update a schedule entry
   * @param {string} scheduleId - Schedule ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated schedule
   */
  static async updateSchedule(scheduleId, updateData) {
    try {
      const setClause = [];
      const queryParams = [scheduleId];
      let paramIndex = 2;

      // Build dynamic update query
      const allowedFields = [
        'session_title', 'session_type', 'session_description',
        'schedule_date', 'lab_id', 'room_name', 'instructor_id',
        'instructor_name', 'class_id', 'group_id', 'student_count',
        'max_capacity', 'status', 'color_code', 'notes'
      ];

      for (const [key, value] of Object.entries(updateData)) {
        const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (allowedFields.includes(dbField)) {
          setClause.push(`${dbField} = $${paramIndex}`);
          queryParams.push(value);
          paramIndex++;
        }
      }

      if (setClause.length === 0) {
        throw new Error('No valid fields to update');
      }

      const result = await query(`
        UPDATE timetable_schedules
        SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, queryParams);

      if (result.rows.length === 0) {
        throw new Error('Schedule not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Failed to update schedule:', error);
      throw error;
    }
  }

  /**
   * Delete a schedule entry
   * @param {string} scheduleId - Schedule ID
   * @returns {Promise<boolean>} Success status
   */
  static async deleteSchedule(scheduleId) {
    try {
      const result = await query(`
        DELETE FROM timetable_schedules WHERE id = $1
      `, [scheduleId]);

      return result.rowCount > 0;
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      throw error;
    }
  }

  /**
   * Get conflicts for a schedule
   * @param {string} scheduleId - Schedule ID
   * @returns {Promise<Array>} List of conflicts
   */
  static async getScheduleConflicts(scheduleId) {
    try {
      const result = await query(`
        SELECT * FROM detect_schedule_conflicts($1)
      `, [scheduleId]);

      return result.rows;
    } catch (error) {
      console.error('Failed to get schedule conflicts:', error);
      throw error;
    }
  }

  /**
   * Activate a timetable version (version control)
   * @param {string} versionId - Version ID to activate
   * @param {Date} effectiveDate - Date when version becomes active
   * @returns {Promise<Object>} Activation result
   */
  static async activateTimetableVersion(versionId, effectiveDate = new Date()) {
    const client = await query.connect();

    try {
      await client.query('BEGIN');

      // Deactivate current active version
      await client.query(`
        UPDATE timetable_versions
        SET is_active = false,
            effective_until = $1 - INTERVAL '1 day'
        WHERE is_active = true
      `, [effectiveDate]);

      // Activate the new version
      const result = await client.query(`
        UPDATE timetable_versions
        SET is_active = true,
            effective_from = $1,
            effective_until = NULL
        WHERE id = $2
        RETURNING *
      `, [effectiveDate, versionId]);

      if (result.rows.length === 0) {
        throw new Error('Timetable version not found');
      }

      await client.query('COMMIT');

      return {
        activatedVersion: result.rows[0],
        effectiveDate: effectiveDate
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Failed to activate timetable version:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get timetable version history and changes
   * @param {string} versionId - Version ID (optional)
   * @returns {Promise<Array>} Version history
   */
  static async getTimetableVersionHistory(versionId = null) {
    try {
      let whereClause = '';
      const queryParams = [];

      if (versionId) {
        whereClause = 'WHERE tv.id = $1';
        queryParams.push(versionId);
      }

      const result = await query(`
        SELECT
          tv.*,
          u.first_name || ' ' || u.last_name as created_by_name,
          (SELECT COUNT(*) FROM periods p WHERE p.timetable_version_id = tv.id) as period_count,
          (SELECT COUNT(*) FROM timetable_schedules s WHERE s.timetable_version_id = tv.id) as schedule_count,
          (SELECT COUNT(*) FROM timetable_schedules s WHERE s.timetable_version_id = tv.id AND s.status = 'scheduled') as active_schedule_count
        FROM timetable_versions tv
        LEFT JOIN users u ON tv.created_by = u.id
        ${whereClause}
        ORDER BY tv.effective_from DESC, tv.created_at DESC
      `, queryParams);

      return result.rows;
    } catch (error) {
      console.error('Failed to get timetable version history:', error);
      throw error;
    }
  }

  /**
   * Compare two timetable versions
   * @param {string} version1Id - First version ID
   * @param {string} version2Id - Second version ID
   * @returns {Promise<Object>} Comparison result
   */
  static async compareTimetableVersions(version1Id, version2Id) {
    try {
      // Get periods comparison
      const periodsComparison = await query(`
        SELECT
          'periods' as type,
          COALESCE(p1.period_number, p2.period_number) as period_number,
          p1.period_name as version1_name,
          p2.period_name as version2_name,
          p1.start_time as version1_start,
          p2.start_time as version2_start,
          p1.end_time as version1_end,
          p2.end_time as version2_end,
          CASE
            WHEN p1.id IS NULL THEN 'added'
            WHEN p2.id IS NULL THEN 'removed'
            WHEN p1.start_time != p2.start_time OR p1.end_time != p2.end_time OR p1.period_name != p2.period_name THEN 'modified'
            ELSE 'unchanged'
          END as change_type
        FROM periods p1
        FULL OUTER JOIN periods p2 ON p1.period_number = p2.period_number
        WHERE (p1.timetable_version_id = $1 OR p1.timetable_version_id IS NULL)
          AND (p2.timetable_version_id = $2 OR p2.timetable_version_id IS NULL)
        ORDER BY COALESCE(p1.period_number, p2.period_number)
      `, [version1Id, version2Id]);

      // Get schedule count comparison
      const scheduleComparison = await query(`
        SELECT
          'schedules' as type,
          (SELECT COUNT(*) FROM timetable_schedules WHERE timetable_version_id = $1) as version1_count,
          (SELECT COUNT(*) FROM timetable_schedules WHERE timetable_version_id = $2) as version2_count
      `, [version1Id, version2Id]);

      return {
        periods: periodsComparison.rows,
        schedules: scheduleComparison.rows[0],
        summary: {
          periodsChanged: periodsComparison.rows.filter(p => p.change_type !== 'unchanged').length,
          totalPeriods: periodsComparison.rows.length
        }
      };
    } catch (error) {
      console.error('Failed to compare timetable versions:', error);
      throw error;
    }
  }

  /**
   * Validate timetable version integrity
   * @param {string} versionId - Version ID
   * @returns {Promise<Object>} Validation result
   */
  static async validateTimetableVersion(versionId) {
    try {
      const issues = [];

      // Check for orphaned schedules
      const orphanedSchedules = await query(`
        SELECT COUNT(*) as count
        FROM timetable_schedules s
        LEFT JOIN periods p ON s.period_id = p.id
        WHERE s.timetable_version_id = $1 AND p.id IS NULL
      `, [versionId]);

      if (parseInt(orphanedSchedules.rows[0].count) > 0) {
        issues.push({
          type: 'orphaned_schedules',
          count: parseInt(orphanedSchedules.rows[0].count),
          description: 'Schedules referencing non-existent periods'
        });
      }

      // Check for period gaps
      const periodGaps = await query(`
        SELECT
          period_number,
          LAG(period_number) OVER (ORDER BY period_number) as prev_period
        FROM periods
        WHERE timetable_version_id = $1
        ORDER BY period_number
      `, [versionId]);

      const gaps = periodGaps.rows.filter(p =>
        p.prev_period && p.period_number - p.prev_period > 1
      );

      if (gaps.length > 0) {
        issues.push({
          type: 'period_gaps',
          gaps: gaps.map(g => `Gap between period ${g.prev_period} and ${g.period_number}`),
          description: 'Missing period numbers in sequence'
        });
      }

      // Check for overlapping periods
      const overlappingPeriods = await query(`
        SELECT
          p1.period_name as period1,
          p2.period_name as period2
        FROM periods p1
        JOIN periods p2 ON p1.id != p2.id
        WHERE p1.timetable_version_id = $1
          AND p2.timetable_version_id = $1
          AND p1.start_time < p2.end_time
          AND p2.start_time < p1.end_time
      `, [versionId]);

      if (overlappingPeriods.rows.length > 0) {
        issues.push({
          type: 'overlapping_periods',
          overlaps: overlappingPeriods.rows,
          description: 'Periods with overlapping time ranges'
        });
      }

      return {
        isValid: issues.length === 0,
        issues: issues,
        validatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to validate timetable version:', error);
      throw error;
    }
  }

  /**
   * Archive old timetable versions
   * @param {Date} cutoffDate - Date before which versions should be archived
   * @returns {Promise<Object>} Archive result
   */
  static async archiveOldVersions(cutoffDate) {
    try {
      const result = await query(`
        UPDATE timetable_versions
        SET is_active = false
        WHERE effective_until < $1
          AND is_active = true
        RETURNING id, version_number, version_name
      `, [cutoffDate]);

      return {
        archivedVersions: result.rows,
        archivedCount: result.rows.length,
        archivedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to archive old versions:', error);
      throw error;
    }
  }

  /**
   * Get timetable configuration
   * @returns {Promise<Object>} Timetable configuration
   */
  static async getTimetableConfig() {
    try {
      const result = await query(`
        SELECT * FROM timetable_config
        ORDER BY created_at DESC
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        // Return default config if none exists
        return {
          max_lectures_per_day: 8,
          lecture_duration_minutes: 45,
          break_duration_minutes: 15,
          start_time: '08:00:00',
          end_time: '17:00:00',
          working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        };
      }

      return result.rows[0];
    } catch (error) {
      console.error('Failed to get timetable config:', error);
      throw error;
    }
  }

  /**
   * Update timetable configuration
   * @param {Object} configData - Configuration data
   * @returns {Promise<Object>} Updated configuration
   */
  static async updateTimetableConfig(configData) {
    try {
      const {
        max_lectures_per_day,
        lecture_duration_minutes,
        break_duration_minutes,
        start_time,
        end_time,
        working_days
      } = configData;

      // Check if config exists
      const existingConfig = await query(`
        SELECT id FROM timetable_config
        ORDER BY created_at DESC
        LIMIT 1
      `);

      let result;
      if (existingConfig.rows.length > 0) {
        // Update existing config
        const setClause = [];
        const queryParams = [existingConfig.rows[0].id];
        let paramIndex = 2;

        const allowedFields = {
          max_lectures_per_day,
          lecture_duration_minutes,
          break_duration_minutes,
          start_time,
          end_time,
          working_days
        };

        Object.entries(allowedFields).forEach(([field, value]) => {
          if (value !== undefined) {
            setClause.push(`${field} = $${paramIndex}`);
            queryParams.push(value);
            paramIndex++;
          }
        });

        if (setClause.length === 0) {
          throw new Error('No valid fields to update');
        }

        result = await query(`
          UPDATE timetable_config
          SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING *
        `, queryParams);
      } else {
        // Create new config
        result = await query(`
          INSERT INTO timetable_config (
            max_lectures_per_day, lecture_duration_minutes, break_duration_minutes,
            start_time, end_time, working_days
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [
          max_lectures_per_day || 8,
          lecture_duration_minutes || 45,
          break_duration_minutes || 15,
          start_time || '08:00:00',
          end_time || '17:00:00',
          working_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        ]);
      }

      return result.rows[0];
    } catch (error) {
      console.error('Failed to update timetable config:', error);
      throw error;
    }
  }

  /**
   * Generate periods based on configuration
   * @param {Object} config - Period generation configuration
   * @returns {Promise<Object>} Generated periods and statistics
   */
  static async generatePeriodsFromConfig(config) {
    try {
      const {
        schoolStartTime,
        schoolEndTime,
        lectureDurationMinutes,
        numberOfBreaks = 0,
        breakConfigurations = [],
        includeBreaks = true
      } = config;

      // Validate time range
      const startDate = new Date(`2000-01-01T${schoolStartTime}`);
      const endDate = new Date(`2000-01-01T${schoolEndTime}`);

      if (startDate >= endDate) {
        throw new Error('School end time must be after start time');
      }

      // Calculate total available time in minutes
      const totalMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);

      // Sort break configurations by lecture position - only use if breaks are enabled and configured
      const sortedBreaks = (includeBreaks && breakConfigurations && breakConfigurations.length > 0) ?
        [...breakConfigurations].sort((a, b) => a.afterLecture - b.afterLecture) : [];

      // Generate periods with sequential lecture numbering and odd period numbers
      const periods = [];
      let currentTime = new Date(startDate);
      let lectureCount = 0; // Sequential lecture counter (1, 2, 3, 4, 5...)
      let periodNumber = 1; // Odd period numbers (1, 3, 5, 7, 9...)
      let displayOrder = 1;

      // Handle Period 0 (Morning Assembly) break if configured
      const morningAssemblyBreak = sortedBreaks.find(b => b.afterLecture === 0);
      if (morningAssemblyBreak) {
        const assemblyEndTime = new Date(currentTime.getTime() + (morningAssemblyBreak.durationMinutes * 60 * 1000));
        periods.push({
          periodNumber: 0,
          periodName: morningAssemblyBreak.name || 'Morning Assembly',
          startTime: currentTime.toTimeString().slice(0, 8),
          endTime: assemblyEndTime.toTimeString().slice(0, 8),
          isBreak: true,
          breakDurationMinutes: morningAssemblyBreak.durationMinutes,
          displayOrder: displayOrder++
        });
        currentTime = assemblyEndTime;
      }

      while (currentTime < endDate) {
        // Check if we have enough time for a full lecture period
        const remainingMinutes = (endDate.getTime() - currentTime.getTime()) / (1000 * 60);

        if (remainingMinutes < lectureDurationMinutes) {
          break; // Not enough time for another period
        }

        // Add lecture period - sequential lecture numbering but odd period numbers
        lectureCount++; // Sequential: 1, 2, 3, 4, 5...
        const lectureEndTime = new Date(currentTime.getTime() + (lectureDurationMinutes * 60 * 1000));

        periods.push({
          periodNumber: periodNumber, // Odd numbers: 1, 3, 5, 7, 9...
          periodName: `Lecture ${lectureCount}`, // Sequential lecture names
          startTime: currentTime.toTimeString().slice(0, 8),
          endTime: lectureEndTime.toTimeString().slice(0, 8),
          isBreak: false,
          breakDurationMinutes: 0,
          displayOrder: displayOrder++
        });

        currentTime = new Date(lectureEndTime);

        // Check if there's a break scheduled after this specific lecture count
        const breakAfterThisLecture = sortedBreaks.find(b => b.afterLecture === lectureCount && b.afterLecture !== 0);

        if (breakAfterThisLecture) {
          const breakEndTime = new Date(currentTime.getTime() + (breakAfterThisLecture.durationMinutes * 60 * 1000));

          // Check if adding this break still leaves time for another lecture
          const remainingAfterBreak = (endDate.getTime() - breakEndTime.getTime()) / (1000 * 60);

          // Add break if there's time for another lecture or if it's near end of day
          if (remainingAfterBreak >= lectureDurationMinutes || remainingAfterBreak > 30) {
            periods.push({
              periodNumber: periodNumber + 1, // Even number for breaks (2, 4, 6, 8...)
              periodName: breakAfterThisLecture.name || `Break after Lecture ${lectureCount}`,
              startTime: currentTime.toTimeString().slice(0, 8),
              endTime: breakEndTime.toTimeString().slice(0, 8),
              isBreak: true,
              breakDurationMinutes: breakAfterThisLecture.durationMinutes,
              displayOrder: displayOrder++
            });

            currentTime = breakEndTime;
          }
        }

        // Always increment to next odd period number for next lecture
        periodNumber += 2; // 1->3, 3->5, 5->7, etc.
      }

      // Calculate statistics
      const lecturePeriods = periods.filter(p => !p.isBreak);
      const breakPeriods = periods.filter(p => p.isBreak);
      const totalLectureTime = lecturePeriods.length * lectureDurationMinutes;
      const totalBreakTime = breakPeriods.reduce((sum, bp) => sum + bp.breakDurationMinutes, 0);
      const utilizationPercentage = Math.round((totalLectureTime / totalMinutes) * 100);

      return {
        periods,
        totalPeriods: lecturePeriods.length,
        totalBreaks: breakPeriods.length,
        totalDuration: totalLectureTime,
        totalBreakTime: totalBreakTime,
        schoolDayDuration: totalMinutes,
        utilizationPercentage
      };
    } catch (error) {
      console.error('Failed to generate periods from config:', error);
      throw error;
    }
  }
}

module.exports = TimetableService;
