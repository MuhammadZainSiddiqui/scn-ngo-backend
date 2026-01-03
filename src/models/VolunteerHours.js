import { executeQuery } from '../config/database.js';

export const VolunteerHours = {
  async logHours(hoursData) {
    const query = `
      INSERT INTO volunteer_hours (
        volunteer_id, program_id, work_date, hours, notes, logged_by, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;

    const params = [
      hoursData.volunteer_id,
      hoursData.program_id,
      hoursData.work_date,
      hoursData.hours,
      hoursData.notes || null,
      hoursData.logged_by || null,
    ];

    const result = await executeQuery(query, params);
    return this.findById(result.insertId);
  },

  async findById(id) {
    const query = `
      SELECT
        vh.*,
        p.name as program_name,
        v.first_name as volunteer_first_name,
        v.last_name as volunteer_last_name
      FROM volunteer_hours vh
      LEFT JOIN programs p ON vh.program_id = p.id
      LEFT JOIN volunteers v ON vh.volunteer_id = v.id
      WHERE vh.id = ?
    `;

    const results = await executeQuery(query, [id]);
    return results[0] || null;
  },

  async getSummaryByVolunteer(volunteerId) {
    const query = `
      SELECT
        vh.program_id,
        p.name as program_name,
        COALESCE(SUM(vh.hours), 0) as total_hours,
        COALESCE(SUM(CASE WHEN vh.work_date >= DATE_SUB(CURDATE(), INTERVAL 28 DAY) THEN vh.hours ELSE 0 END), 0) as hours_last_28_days,
        COUNT(*) as entries_count,
        MIN(vh.work_date) as first_logged_date,
        MAX(vh.work_date) as last_logged_date
      FROM volunteer_hours vh
      LEFT JOIN programs p ON vh.program_id = p.id
      WHERE vh.volunteer_id = ?
      GROUP BY vh.program_id
      ORDER BY total_hours DESC
    `;

    const data = await executeQuery(query, [volunteerId]);

    const totalQuery = `
      SELECT
        COALESCE(SUM(hours), 0) as total_hours,
        COALESCE(SUM(CASE WHEN work_date >= DATE_SUB(CURDATE(), INTERVAL 28 DAY) THEN hours ELSE 0 END), 0) as hours_last_28_days
      FROM volunteer_hours
      WHERE volunteer_id = ?
    `;

    const [totals] = await executeQuery(totalQuery, [volunteerId]);

    return {
      totals: {
        total_hours: parseFloat(totals?.total_hours ?? 0),
        hours_last_28_days: parseFloat(totals?.hours_last_28_days ?? 0),
      },
      by_program: data.map((row) => ({
        ...row,
        total_hours: parseFloat(row.total_hours),
        hours_last_28_days: parseFloat(row.hours_last_28_days),
      })),
    };
  },

  async getBurnoutStats(volunteerId) {
    const query = `
      SELECT
        COALESCE(SUM(hours), 0) as hours_last_28_days,
        COALESCE(SUM(CASE WHEN work_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN hours ELSE 0 END), 0) as hours_last_7_days
      FROM volunteer_hours
      WHERE volunteer_id = ? AND work_date >= DATE_SUB(CURDATE(), INTERVAL 28 DAY)
    `;

    const [row] = await executeQuery(query, [volunteerId]);

    return {
      hours_last_28_days: parseFloat(row?.hours_last_28_days ?? 0),
      hours_last_7_days: parseFloat(row?.hours_last_7_days ?? 0),
    };
  },
};

export default VolunteerHours;
