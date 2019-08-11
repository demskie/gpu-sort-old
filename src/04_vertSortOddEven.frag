precision highp float;
precision highp int;
precision highp sampler2D;

uniform sampler2D u_gpuSortedObjects;

const float GPU_SORTED_OBJECTS_WIDTH = ${textureWidth};

float round(float f) { return floor(f + 0.5); }
float floatEquals(float f1, float f2) { return 1.0 - abs(sign(f1 - f2)); }
float floatNotEquals(float f1, float f2) { return abs(sign(f1 - f2)); }
float floatLessThan(float f1, float f2) { return max(sign(f2 - f1), 0.0); }
float floatGreaterThan(float f1, float f2) { return max(sign(f1 - f2), 0.0); }
float floatLessThanOrEqual(float f1, float f2) { return 1.0 - floatGreaterThan(f1, f2); }
float floatGreaterThanOrEqual(float f1, float f2) { return 1.0 - floatLessThan(f1, f2); }
float vec2ToInt16(vec2 v) { return clamp(floor(floor(v.r * 255.0) * 256.0) + floor(v.g * 255.0) - 32767.0, -32767.0, 32768.0); }
vec2 int16ToVec2(float f) { f = clamp(f, -32767.0, 32768.0) + 32767.0; return vec2(floor(f / 256.0), f - floor(f / 256.0) * 256.0) / 255.0; }
void unpackBooleans(float f, inout bool arr[8]) { f = floor(f * 255.0); arr[7] = bool(int(floatGreaterThanOrEqual(f, 128.0))); f -= floatGreaterThanOrEqual(f, 128.0) * 128.0; arr[6] = bool(int(floatGreaterThanOrEqual(f, 64.0))); f -= floatGreaterThanOrEqual(f, 64.0) * 64.0; arr[5] = bool(int(floatGreaterThanOrEqual(f, 32.0))); f -= floatGreaterThanOrEqual(f, 32.0) * 32.0; arr[4] = bool(int(floatGreaterThanOrEqual(f, 16.0))); f -= floatGreaterThanOrEqual(f, 16.0) * 16.0; arr[3] = bool(int(floatGreaterThanOrEqual(f, 8.0))); f -= floatGreaterThanOrEqual(f, 8.0) * 8.0; arr[2] = bool(int(floatGreaterThanOrEqual(f, 4.0))); f -= floatGreaterThanOrEqual(f, 4.0) * 4.0; arr[1] = bool(int(floatGreaterThanOrEqual(f, 2.0))); f -= floatGreaterThanOrEqual(f, 2.0) * 2.0; arr[0] = bool(int(floatGreaterThanOrEqual(f, 1.0))); }
float packBooleans(bool arr[8]) { float f = float(int(arr[7])) * 128.0; f += float(int(arr[6])) * 64.0; f += float(int(arr[5])) * 32.0; f += float(int(arr[4])) * 16.0; f += float(int(arr[3])) * 8.0; f += float(int(arr[2])) * 4.0; f += float(int(arr[1])) * 2.0; return f + float(int(arr[0])); }
vec2 addToVec2(vec2 v, float f, float w) { v.y += floor((v.x + f) / w); v.x = mod(v.x + f, w); return v; }

void main() {
	// determine if we're outputting to one of the top side texels
	float outputToOddBool = floatEquals(mod(floor(gl_FragCoord.y), 2.0), 1.0);

	// calculate coordinates
	vec2 oddFragCoord = vec2(gl_FragCoord.x, gl_FragCoord.y - floatEquals(outputToOddBool, 0.0));
	vec2 evenFragCoord = vec2(oddFragCoord.x, oddFragCoord.y + 1.0);

	// constrain for (literal) edge case
	oddFragCoord.y = clamp(oddFragCoord.y, 0.5, GPU_SORTED_OBJECTS_WIDTH - 0.5);
	evenFragCoord.y = clamp(evenFragCoord.y, 0.5, GPU_SORTED_OBJECTS_WIDTH - 0.5);

	// get texels
	vec4 oddTexel = texture2D(u_gpuSortedObjects, oddFragCoord / GPU_SORTED_OBJECTS_WIDTH);
	vec4 evenTexel = texture2D(u_gpuSortedObjects, evenFragCoord / GPU_SORTED_OBJECTS_WIDTH);
	
	// unpack pixel position data
	float oddY = vec2ToInt16(oddTexel.ba);
	float evenY = vec2ToInt16(evenTexel.ba);
	
	// start creating coordinates for source texel
	vec2 sourceFragCoord = vec2(gl_FragCoord.xy);

	// add to coordinates if (even_position_comes_before && we_are_odd)
	sourceFragCoord.y += floatLessThan(evenY, oddY) * outputToOddBool;

	// subtract to coordinates if (even_position_comes_before && we_are_even)
	sourceFragCoord.y -= floatLessThan(evenY, oddY) * floatEquals(outputToOddBool, 0.0);
	
	// return the source texel
	gl_FragColor = texture2D(u_gpuSortedObjects, sourceFragCoord / GPU_SORTED_OBJECTS_WIDTH);
}
