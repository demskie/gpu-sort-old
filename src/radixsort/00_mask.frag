precision mediump float;
precision mediump int;
precision mediump sampler2D;

uniform sampler2D u_data;

uniform float u_bitIndex;

const float TEXTURE_WIDTH = ${textureWidth};

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
bool getMSB(float f) { return floatGreaterThanOrEqual(f * 255.0, 128.0); }
float clearMSB(float f) { return (f * 255.0 - floatGreaterThanOrEqual(f * 255.0, 128.0) * 128.0) / 255.0; }
float setMSB(float f, bool b) { return (f * 255.0 + float(b) * floatGreaterThanOrEqual(f * 255.0, 128.0) * 128.0) / 255.0; }

void main() {
	// get the byte value that contains the bit flag in question
	vec4 texel = texture2D(u_data, gl_FragCoord.xy / TEXTURE_WIDTH);
	float byte = floatGreaterThanOrEqual(bitIndex, 0.0) * floatLessThan(bitIndex, 8.0) * texel.r
			   + floatGreaterThanOrEqual(bitIndex, 8.0) * floatLessThan(bitIndex, 16.0) * texel.g
			   + floatGreaterThanOrEqual(bitIndex, 16.0) * floatLessThan(bitIndex, 24.0) * texel.b
			   + floatGreaterThanOrEqual(bitIndex, 24.0) * floatLessThan(bitIndex, 32.0) * texel.a;
	
	// pull bit flag from byte value
	bool boolArray[8];
	unpackBooleans(byte, boolArray);
	bool bitFlag = boolArray[int(mod(bitIndex, 8.0))];

	// push bit flag into most significant bit of red color channel
	gl_FragColor = vec4(setMSB(0.0, bitFlag), 0.0, 0.0, 0.0);
}