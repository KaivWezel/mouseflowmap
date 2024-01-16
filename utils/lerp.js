export default function lerp(min, max, value) {
	return min + value * (max - min);
}
