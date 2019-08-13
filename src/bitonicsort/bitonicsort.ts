import * as gpu from "gpu-compute";
import { uniformInt32Range } from "../lib/notrandom";

export function bitonicSort() {
	const textureWidth = 4;

	const bitonicSortSource = require("fs").readFileSync("src/bitonicsort/032_bitonicSort.frag", "utf8");

	const indices = new gpu.RenderTarget(textureWidth);
	const firstByteSlice = new gpu.RenderTarget(textureWidth);
	const fragVariables = { textureWidth: `${textureWidth}.0` };
	const computeShader = new gpu.ComputeShader(bitonicSortSource, fragVariables);

	indices.pushTextureData(createIndices(textureWidth));

	const bytes = new Uint8Array(textureWidth * textureWidth * 4);
	for (var i = 0; i < bytes.length; i += 4) {
		bytes[i] = i / 4;
	}
	firstByteSlice.pushTextureData(bytes);

	let start = Date.now();
	for (var i = 0; i < 10; i++) {
		indices.compute(computeShader, {
			u_indices: indices,
			u_firstByteSlice: firstByteSlice
		});
		break;
	}
	console.log(unpackIndices(indices.readPixels()));
}

function createIndices(textureWidth: number) {
	const bytes = new Uint8Array(textureWidth * textureWidth * 4);
	for (var i = 0; i < bytes.length; i += 4) {
		var xArr = gpu.packInt16(i % textureWidth);
		var yArr = gpu.packInt16(i / textureWidth);
		bytes[i + 0] = xArr[0];
		bytes[i + 1] = xArr[1];
		bytes[i + 2] = yArr[0];
		bytes[i + 3] = yArr[1];
	}
	return bytes;
}

function unpackIndices(bytes: Uint8Array) {
	const arr = [];
	for (var i = 0; i < bytes.length; i += 4) {
		arr.push([gpu.unpackInt16(bytes[i + 0], bytes[i + 1]), gpu.unpackInt16(bytes[i + 2], bytes[i + 3])]);
	}
	return arr;
}
