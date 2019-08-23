import * as gpu from "gpu-compute";
import { uniformInt32Range } from "../lib/notrandom";

export function bitonicSort(textureWidth: number) {
	const bitonicSortSource = require("fs").readFileSync("src/bitonicsort/032_bitonicSort.frag", "utf8");

	const searchAndReplace = {
		"const float TEXTURE_WIDTH = 1.0;": `const float TEXTURE_WIDTH = ${textureWidth}.0;`,
		"float round(float f);": gpu.functionStrings.round,
		"float floatEquals(float f1, float f2);": gpu.functionStrings.floatEquals,
		"float floatNotEquals(float f1, float f2); ": gpu.functionStrings.floatNotEquals,
		"float floatLessThan(float f1, float f2);": gpu.functionStrings.floatLessThan,
		"float floatGreaterThan(float f1, float f2);": gpu.functionStrings.floatGreaterThan,
		"float floatLessThanOrEqual(float f1, float f2);": gpu.functionStrings.floatLessThanOrEqual,
		"float floatGreaterThanOrEqual(float f1, float f2);": gpu.functionStrings.floatGreaterThanOrEqual,
		"float vec2ToInt16(vec2 v);": gpu.functionStrings.vec2ToInt16,
		"vec2 int16ToVec2(float f);": gpu.functionStrings.int16ToVec2,
		"void unpackBooleans(float f, inout bool arr[8]);": gpu.functionStrings.unpackBooleans,
		"float packBooleans(bool arr[8]);": gpu.functionStrings.packBooleans,
		"vec2 addToVec2(vec2 v, float f, float w);": `
		vec2 addToVec2(vec2 v, float f, float w) {
			v.y += floor((v.x + f) / w);
			v.x = mod(v.x + f, w);
			return v;
		}`
	};

	const indices = new gpu.RenderTarget(textureWidth);
	const firstByteSlice = new gpu.RenderTarget(textureWidth);
	const computeShader = new gpu.ComputeShader(bitonicSortSource, searchAndReplace);

	indices.pushTextureData(createIndices(textureWidth));

	const bytes = new Uint8Array(textureWidth * textureWidth * 4);
	for (var i = 0; i < bytes.length; i += 4) {
		// bytes[i + 0] = gpu.packInt16(gpu.MAX_INT16 - i / 4)[0];
		// bytes[i + 1] = gpu.packInt16(gpu.MAX_INT16 - i / 4)[1];
	}
	firstByteSlice.pushTextureData(bytes);

	const bitonicUniforms = calculateBitonicUniforms(textureWidth);

	let start = Date.now();
	for (var i = 0; i < bitonicUniforms.length; i++) {
		indices.compute(computeShader, {
			u_indices: indices,
			u_firstByteSlice: firstByteSlice,
			u_blockSizeX: bitonicUniforms[i].blockSizeX,
			u_blockSizeY: bitonicUniforms[i].blockSizeY,
			u_regionSizeX: bitonicUniforms[i].regionSizeX,
			u_regionSizeY: bitonicUniforms[i].regionSizeY
		});
	}
	indices.readPixels();
	console.log(`finished BitonicSort in: ${Date.now() - start}ms`);

	indices.delete();
	firstByteSlice.delete();
	computeShader.delete();
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
		let v = [gpu.unpackInt16(bytes[i + 0], bytes[i + 1]), gpu.unpackInt16(bytes[i + 2], bytes[i + 3])];
		s += `\ti: ${i / 4}  \tp: [ ${v[0]}, ${v[1]} ]\n`;
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
			arr.push({
				blockSizeX: Math.floor(bs % width) > 0 ? Math.floor(bs % width) : width,
				blockSizeY: Math.max(Math.floor(bs / width), 1),
				regionSizeX: Math.floor(rs % width) > 0 ? Math.floor(rs % width) : width,
				regionSizeY: Math.max(Math.floor(rs / width), 1)
			});
		}
	}
	return arr;
}
