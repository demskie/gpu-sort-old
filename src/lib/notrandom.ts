/* tslint:disable */

// https://jsfiddle.net/alexdemskie/3L0rd6ph/214/
// https://stackoverflow.com/a/47593316

export const MAX_UINT32 = Math.pow(2, 32) - 1;

export function uniformInt32(s: number) {
	s += 0x6d2b79f5;
	s = Math.imul(s ^ (s >>> 15), s | 1);
	s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
	return (s ^ (s >>> 14)) >>> 0;
}

export function uniformInt32Range(s: number, min: number, max: number) {
	var val = uniformInt32(s);
	var diff = MAX_UINT32 / (Math.floor(max) - Math.floor(min));
	return Math.floor(val / diff) + Math.floor(min);
}

export function normalInt32Range(seed: number, min: number, max: number) {
	var val = uniformInt32(seed);
	val += uniformInt32(seed + 1);
	val += uniformInt32(seed - 1);
	val = Math.floor(val / 3);
	var diff = MAX_UINT32 / (Math.floor(max) - Math.floor(min));
	return Math.floor(val / diff) + Math.floor(min);
}

export type weightedObject = {
	weight: number;
	value: any;
};

export function weightedChoice(choices: weightedObject[], seed: number) {
	let max = 0;
	for (var i = 0; i < choices.length; i++) {
		max += choices[i].weight;
	}
	let num = normalInt32Range(seed, 0, max + 1);
	for (i = 0; i < choices.length; i++) {
		num -= choices[i].weight;
		if (num <= 0) {
			return choices[i].value;
		}
	}
	return undefined;
}
