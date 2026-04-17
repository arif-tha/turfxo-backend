const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const getIstDate = () => {
  const now = new Date();
  const istOffsetMinutes = 330;
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + istOffsetMinutes * 60000);
};

const getSlotDateTime = (date, time, openTime, closeTime) => {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const slotUtcMs = Date.UTC(year, month - 1, day, hours, minutes) - 330 * 60000;
  const slotDate = new Date(slotUtcMs);
  const openMinutes = timeToMinutes(openTime);
  const closeMinutes = timeToMinutes(closeTime);
  const slotMinutes = timeToMinutes(time);
  const isOvernight = closeMinutes <= openMinutes;
  if (isOvernight && slotMinutes < openMinutes) {
    slotDate.setUTCDate(slotDate.getUTCDate() + 1);
  }
  return slotDate;
};

const istNow = getIstDate();
console.log('istNow', istNow.toISOString(), istNow.toString());
[
  { date: '2026-04-17', time: '06:00' },
  { date: '2026-04-17', time: '10:00' },
  { date: '2026-04-17', time: '17:00' },
  { date: '2026-04-17', time: '20:00' },
  { date: '2026-04-17', time: '23:00' },
  { date: '2026-04-17', time: '00:00' },
  { date: '2026-04-17', time: '01:00' },
].forEach(({ date, time }) => {
  const slot = getSlotDateTime(date, time, '06:00', '03:00');
  console.log(time, slot.toISOString(), slot.toString(), 'past?', slot <= istNow);
});
