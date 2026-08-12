export function organizeImportPhones(
  phone1?: string,
  phone2?: string,
  phone3?: string,
) {
  const primaryPhone = phone1 || phone2 || phone3;
  const promotedFromFallback = !phone1 && Boolean(phone2 || phone3);
  const remainingPhones = [phone1, phone2, phone3]
    .filter((candidate): candidate is string => Boolean(candidate) && candidate !== primaryPhone);

  return {
    phone: primaryPhone,
    phone2: remainingPhones[0],
    phone3: remainingPhones[1],
    promotedFromFallback,
  };
}
