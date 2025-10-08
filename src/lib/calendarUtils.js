/**
 * Adds the specified number of minutes to a Date instance and returns a new
 * Date.  This helper is used to compute default end times when creating
 * events.  It avoids mutating the original Date object.
 *
 * @param {Date} date - The starting date
 * @param {number} minutes - Number of minutes to add
 * @returns {Date} A new Date with the minutes added
 */
export function addMinutes(date, minutes) {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}