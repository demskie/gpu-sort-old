import * as gpu from "gpu-compute";

import { oddEvenSort } from "./oddevensort/oddeven";
import { bitonicSort } from "./bitonicsort/bitonicsort";
import { radixSort } from "./radixsort/radixsort";

for (var textureWidth of [256, 512, 1024, 2048, 4096].values()) {
	console.log(`dimensions: ${textureWidth} x ${textureWidth}`);

	radixSort(textureWidth);
	bitonicSort(textureWidth);
	oddEvenSort(textureWidth);

	const randomBytes = () =>
		new Uint8Array([Math.random() * 256, Math.random() * 256, Math.random() * 256, Math.random() * 256]);

	const unsortedData = Array.from(Array(textureWidth * textureWidth), () => randomBytes());

	let start = Date.now();
	unsortedData.sort();
	console.log(`finished Array.sort() in: ${Date.now() - start}ms\n`);
}
