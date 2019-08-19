precision mediump float;
precision mediump int;
precision mediump sampler2D;

uniform sampler2D u_indices;

const float TEXTURE_WIDTH = ${textureWidth};

void main() {
	gl_FragColor = texture2D(u_indices, gl_FragCoord.xy / TEXTURE_WIDTH);
}