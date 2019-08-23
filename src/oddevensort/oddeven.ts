import * as gpu from "gpu-compute";
import { uniformInt32Range } from "../lib/notrandom";

export function oddEvenSort(textureWidth: number) {
	const oddEvenSort = require("fs").readFileSync("src/oddevensort/032_oddEvenSort.frag", "utf8");

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
	const byteSlice = new gpu.RenderTarget(textureWidth);
	const computeShader = new gpu.ComputeShader(oddEvenSort, searchAndReplace);

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
