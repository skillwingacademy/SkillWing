/**
 * Immutable payroll penalty constants.
 * These values are used by the SessionReconciliationService
 * to calculate teacher payouts and deductions.
 */
module.exports = {
  LATE_PENALTY: 300,        // Teacher joins >5 min after startTime
  NOSHOW_PENALTY: 600,      // Teacher never joins
  LMC_PENALTY: 400,         // Late Minute Cancellation (<4 hours before class)
  LATE_THRESHOLD_MINS: 5,   // Minutes after startTime to consider "late"
  STUDENT_WAIT_MINS: 20,    // Minutes teacher must wait for student no-show exemption
  LMC_THRESHOLD_HOURS: 4,   // Hours before class for LMC penalty
};
