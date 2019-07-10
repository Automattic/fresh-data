
/**
 * Checks if a new date is earlier than an existing one.
 * @param {Date} existingDate The existing date to check against
 * @param {Date} newDate The new date to check against the existing one
 * @return {boolean} True if the new date is earlier, false otherwise
 */
export function isDateEarlier( existingDate, newDate ) {
	if ( existingDate === newDate ) {
		return false;
	}
	if ( ! existingDate && newDate ) {
		return true;
	}
	if ( ! newDate && existingDate ) {
		return false;
	}
	return ( newDate.getTime() < existingDate.getTime() );
}
