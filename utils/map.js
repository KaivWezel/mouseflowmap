export default function map(value, minA, maxA, minB, maxB, clamped = false) {
	if (clamped) value = Math.min(Math.max(minA, maxA), Math.max(Math.min(minA, maxA), value));
	return ((value - minA) / (maxA - minA)) * (maxB - minB) + minB;
}
