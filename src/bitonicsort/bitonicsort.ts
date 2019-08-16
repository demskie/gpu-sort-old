import * as gpu from "gpu-compute";
import { uniformInt32Range } from "../lib/notrandom";

export function bitonicSort() {
	const textureWidth = 4;

	const bitonicSortSource = require("fs").readFileSync("src/bitonicsort/032_bitonicSort.frag", "utf8");

	let start = Date.now();

	const indices = new gpu.RenderTarget(textureWidth);
	const firstByteSlice = new gpu.RenderTarget(textureWidth);
	const fragVariables = { textureWidth: `${textureWidth}.0` };
	const computeShader = new gpu.ComputeShader(bitonicSortSource, fragVariables);

	indices.pushTextureData(createIndices(textureWidth));

	const bytes = new Uint8Array(textureWidth * textureWidth * 4);
	for (var i = 0; i < bytes.length; i += 4) {
		bytes[i + 0] = gpu.packInt16(255 - i)[0];
		bytes[i + 1] = gpu.packInt16(255 - i)[1];
	}
	firstByteSlice.pushTextureData(bytes);

	const bitonicUniforms = calculateBitonicUniforms(textureWidth);
	// console.log(printInt16Pairs(textureWidth, indices.readPixels()));
	for (var i = 0; i < bitonicUniforms.length; i++) {
		console.log(bitonicUniforms[i]);
		if (i >= 99) break;
		if (true) {
			indices.compute(computeShader, {
				u_indices: indices,
				u_firstByteSlice: firstByteSlice,
				u_blockSizeX: bitonicUniforms[i].blockSizeX,
				u_blockSizeY: bitonicUniforms[i].blockSizeY,
				u_regionSizeX: bitonicUniforms[i].regionSizeX,
				u_regionSizeY: bitonicUniforms[i].regionSizeY
			});
			console.log(printFragCoordPairs(textureWidth, indices.readPixels()));
		}
		// console.log(convertFragCoordPairs(textureWidth, indices.readPixels()));
	}

	console.log(`finished BitonicSort in: ${Date.now() - start}ms`);
}

function createIndices(textureWidth: number) {
	const bytes = new Uint8Array(textureWidth * textureWidth * 4);
	for (var i = 0; i < bytes.length; i += 4) {
		var index = Math.floor(i / 4);
		var xArr = gpu.packInt16(Math.floor(index % textureWidth));
		var yArr = gpu.packInt16(Math.floor(index / textureWidth));
		bytes[i + 0] = xArr[0];
		bytes[i + 1] = xArr[1];
		bytes[i + 2] = yArr[0];
		bytes[i + 3] = yArr[1];
	}
	return bytes;
}

function printInt16Pairs(width: number, bytes: Uint8Array) {
	let s = "[\n";
	for (var i = 0; i < bytes.length; i += 4) {
		s += `\ti: ${i / 4}  \tp: [ ${gpu.unpackInt16(bytes[i + 0], bytes[i + 1])}, ${gpu.unpackInt16(
			bytes[i + 2],
			bytes[i + 3]
		)} ]\n`;
	}
	console.log(s + "]\n");
}

function printFragCoordPairs(width: number, bytes: Uint8Array) {
	let s = "[\n";
	for (var i = 0; i < bytes.length; i += 4) {
		let v = gpu.unpackInt16(bytes[i + 0], bytes[i + 1]) + gpu.unpackInt16(bytes[i + 2], bytes[i + 3]) * width;
		s += `\ti: ${i / 4}  \tv: ${v}\n`;
	}
	console.log(s + "]\n");
	// for (var frag of unpackInt16Pairs(bytes)) {
	// 	arr.push(frag[0] + frag[1] * width);
	// }
	// return arr;
}

interface bitonicUniforms {
	blockSizeX: number;
	blockSizeY: number;
	regionSizeX: number;
	regionSizeY: number;
}

function calculateBitonicUniforms(width: number) {
	const arr = [] as bitonicUniforms[];
	for (var rs = 4; rs <= 2 * width * width; rs *= 2) {
		for (var bs = rs / 2; bs > 1; bs /= 2) {
			console.log(`blockSize: ${bs} regionSize: ${rs}`);
			arr.push({
				blockSizeX: width - Math.floor(bs % width),
				blockSizeY: Math.max(Math.floor(bs / width), 1),
				regionSizeX: width - Math.floor(rs % width),
				regionSizeY: Math.max(Math.floor(rs / width), 1)
			});
		}
	}
	return arr;
}
