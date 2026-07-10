import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Senegalese mobile numbers are 9 digits and start with 7
 * (Orange/Free/Expresso ranges: 70, 75, 76, 77, 78), e.g. "7X XXX XX XX".
 * Kept intentionally narrow to the mobile ranges actually used by riders/drivers.
 */
const SENEGAL_MOBILE_REGEX = /^7\d{8}$/;

/**
 * Generic fallback for other country prefixes: digits only, permissive
 * length range so we don't over-constrain numbers we don't have local
 * knowledge of.
 */
const GENERIC_PHONE_REGEX = /^\d{4,15}$/;

/**
 * Builds a phone number format validator that adapts to the currently
 * selected dialing code prefix (a sibling FormControl in the same
 * FormGroup, identified by `prefixControlName`).
 *
 * - When the prefix is Senegal (+221), enforces the local 9-digit mobile
 *   format.
 * - For any other prefix, stays permissive (digits only, reasonable
 *   length) rather than rejecting valid international numbers we don't
 *   have specific rules for.
 *
 * Note: because this validator depends on a sibling control's value,
 * callers should re-trigger `updateValueAndValidity()` on the number
 * control whenever the prefix control changes (see usages).
 */
export function phoneNumberFormatValidator(
  prefixControlName: string
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value === null || control.value === undefined || control.value === '') {
      return null;
    }

    const prefix = control.parent?.get(prefixControlName)?.value;
    const rawValue = String(control.value).replace(/[\s-]/g, '');

    if (prefix === '+221') {
      return SENEGAL_MOBILE_REGEX.test(rawValue)
        ? null
        : { senegalPhoneFormat: true };
    }

    return GENERIC_PHONE_REGEX.test(rawValue) ? null : { phoneFormat: true };
  };
}
