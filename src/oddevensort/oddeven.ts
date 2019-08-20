import * as gpu from "gpu-compute";
import { uniformInt32Range } from "../lib/notrandom";

export function oddEvenSort(textureWidth: number) {
	const oddEvenSort = require("fs").readFileSync("src/oddevensort/032_oddEvenSort.frag", "utf8");
	const indices = new gpu.RenderTarget(textureWidth);
	const byteSlice = new gpu.RenderTarget(textureWidth);
	const fragVariables = { textureWidth: `${textureWidth}.0` };
	const computeShader = new gpu.ComputeShader(oddEvenSort, fragVariables);

	const bytes = new Uint8Array(textureWidth * textureWidth * 4);
	for (var i = 0; i < bytes.length; i += 4) {
		// const xArr = gpu.packInt16(uniformInt32Range(i, gpu.MIN_INT16, gpu.MAX_INT16));
		// const yArr = gpu.packInt16(uniformInt32Range(i + 123, gpu.MIN_INT16, gpu.MAX_INT16));
		// bytes[i + 0] = xArr[0];
		// bytes[i + 1] = xArr[1];
		// bytes[i + 2] = yArr[0];
		// bytes[i + 3] = yArr[1];
	}
	byteSlice.pushTextureData(bytes);

	let start = Date.now();
	for (var i = 0; i < textureWidth * textureWidth; i++) {
		indices.compute(computeShader, { u_indices: indices, u_data: byteSlice, u_iter: i % 2 });
		if (Date.now() - start > 10000) {
			console.log(`finished OddEvenSort in: DNF`);
			return;
		}
	}
	indices.readPixels();
	console.log(`finished OddEvenSort in: ${Date.now() - start}ms`);

	indices.delete();
	byteSlice.delete();
	computeShader.delete();
}
