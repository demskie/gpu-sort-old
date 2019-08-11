import * as gpu from "gpu-compute";
import { uniformInt32Range } from "../NotRandom";

export function brickSort() {
	const textureWidth = 4096;

	const horizSortEvenOdd = require("fs").readFileSync("src/BrickSort/01_horizSortEvenOdd.frag", "utf8");
	const horizSortOddEven = require("fs").readFileSync("src/BrickSort/02_horizSortOddEven.frag", "utf8");
	const vertSortEvenOdd = require("fs").readFileSync("src/BrickSort/03_vertSortEvenOdd.frag", "utf8");
	const vertSortOddEven = require("fs").readFileSync("src/BrickSort/04_vertSortOddEven.frag", "utf8");

	const renderTarget = new gpu.RenderTarget(textureWidth);
	const fragVariables = { textureWidth: `${textureWidth}.0` };
	const firstShader = new gpu.ComputeShader(horizSortEvenOdd, fragVariables);
	const secondShader = new gpu.ComputeShader(horizSortOddEven, fragVariables);
	const thirdShader = new gpu.ComputeShader(vertSortEvenOdd, fragVariables);
	const fourthShader = new gpu.ComputeShader(vertSortOddEven, fragVariables);

	const bytes = new Uint8Array(textureWidth * textureWidth * 4);
	for (var i = 0; i < bytes.length; i += 4) {
		const xArr = gpu.packInt16(uniformInt32Range(i, gpu.MIN_INT16, gpu.MAX_INT16));
		const yArr = gpu.packInt16(uniformInt32Range(i + 123, gpu.MIN_INT16, gpu.MAX_INT16));
		bytes[i + 0] = xArr[0];
		bytes[i + 1] = xArr[1];
		bytes[i + 2] = yArr[0];
		bytes[i + 3] = yArr[1];
	}
	renderTarget.pushTextureData(bytes);

	let start = Date.now();
	for (var i = 0; i < textureWidth / 2; i++) {
		renderTarget.compute(firstShader, { u_gpuSortedObjects: renderTarget });
		renderTarget.compute(secondShader, { u_gpuSortedObjects: renderTarget });
		renderTarget.compute(thirdShader, { u_gpuSortedObjects: renderTarget });
		renderTarget.compute(fourthShader, { u_gpuSortedObjects: renderTarget });
	}
	console.log(`finished BrickSort in: ${Date.now() - start}ms`);
}
