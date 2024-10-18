import { Component, ElementRef, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import * as cryptojs from 'crypto-js';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  canvas!: HTMLCanvasElement;

  canvasProperties = {
    width: 800,
    height: 500,
  };

  renderID = 'Cargando...';
  gpuID = 'Cargando...';
  screenID = 'Cargando...';
  platformID = 'Cargando...';
  timezoneID = 'Cargando...';
  uniqueID = 'Cargando...';

  async ngAfterViewInit(): Promise<void> {
    this.canvas = this.canvasRef.nativeElement;
    const gpuID = this.getGpuID();
    const webGLFingerprint = await this.getWebGLFingerprint();
    const screenFingerprint = `${screen.width}x${screen.height}x${screen.colorDepth}`;
    const platform = navigator.platform;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    this.renderID = cryptojs.SHA256(webGLFingerprint).toString();
    this.gpuID = gpuID;
    this.screenID = screenFingerprint;
    this.platformID = platform;
    this.timezoneID = timezone;
    this.uniqueID = cryptojs
      .SHA256(
        `${gpuID}${webGLFingerprint}${screenFingerprint}${platform}${timezone}`
      )
      .toString();
  }

  getGpuID(): string {
    const gl = this.canvas.getContext('webgl');
    if (!gl) {
      alert('No se pudo obtener el contexto WebGL');
      return '';
    }
    const debugInfo = gl.getExtension(
      'WEBGL_debug_renderer_info'
    ) as WEBGL_debug_renderer_info;
    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    return vendor + '~' + renderer;
  }

  async getWebGLFingerprint(): Promise<string> {
    const webGL: WebGLRenderingContext | null = this.canvas.getContext('webgl');
    if (!webGL) {
      alert('No se pudo obtener el contexto WebGL');
      return '';
    }

    const img = new Image();
    img.src = 'assets/fingerprint.jpg';
    return await new Promise((resolve) => {
      img.onload = () => {
        const texture = webGL.createTexture();
        webGL.bindTexture(webGL.TEXTURE_2D, texture);
        webGL.pixelStorei(webGL.UNPACK_FLIP_Y_WEBGL, true);
        webGL.texImage2D(
          webGL.TEXTURE_2D,
          0,
          webGL.RGBA,
          webGL.RGBA,
          webGL.UNSIGNED_BYTE,
          img
        );

        webGL.texParameteri(
          webGL.TEXTURE_2D,
          webGL.TEXTURE_WRAP_S,
          webGL.CLAMP_TO_EDGE
        );
        webGL.texParameteri(
          webGL.TEXTURE_2D,
          webGL.TEXTURE_WRAP_T,
          webGL.CLAMP_TO_EDGE
        );
        webGL.texParameteri(
          webGL.TEXTURE_2D,
          webGL.TEXTURE_MIN_FILTER,
          webGL.NEAREST
        );
        webGL.texParameteri(
          webGL.TEXTURE_2D,
          webGL.TEXTURE_MAG_FILTER,
          webGL.NEAREST
        );

        const vertexShader = webGL.createShader(
          webGL.VERTEX_SHADER
        ) as WebGLShader;
        webGL.shaderSource(
          vertexShader,
          `
                      attribute vec2 position;
                      attribute vec2 texCoord;
                      varying vec2 vTexCoord;
                      void main() {
                          gl_Position = vec4(position, 0.0, 1.0);
                          vTexCoord = texCoord;
                      }
                  `
        );
        webGL.compileShader(vertexShader);

        const fragmentShader = webGL.createShader(
          webGL.FRAGMENT_SHADER
        ) as WebGLShader;
        webGL.shaderSource(
          fragmentShader,
          `
                      precision mediump float;
                      varying vec2 vTexCoord;
                      uniform sampler2D texture;
                      void main() {
                          gl_FragColor = texture2D(texture, vTexCoord);
                      }
                  `
        );
        webGL.compileShader(fragmentShader);

        const program = webGL.createProgram() as WebGLProgram;
        webGL.attachShader(program, vertexShader);
        webGL.attachShader(program, fragmentShader);
        webGL.linkProgram(program);
        webGL.useProgram(program);

        const buffer = webGL.createBuffer();
        webGL.bindBuffer(webGL.ARRAY_BUFFER, buffer);
        webGL.bufferData(
          webGL.ARRAY_BUFFER,
          new Float32Array([
            -1.0, -1.0, 0.0, 0.0, 1.0, -1.0, 1.0, 0.0, -1.0, 1.0, 0.0, 1.0, 1.0,
            1.0, 1.0, 1.0,
          ]),
          webGL.STATIC_DRAW
        );

        const positionLocation = webGL.getAttribLocation(program, 'position');
        const texCoordLocation = webGL.getAttribLocation(program, 'texCoord');
        webGL.enableVertexAttribArray(positionLocation);
        webGL.vertexAttribPointer(
          positionLocation,
          2,
          webGL.FLOAT,
          false,
          16,
          0
        );
        webGL.enableVertexAttribArray(texCoordLocation);
        webGL.vertexAttribPointer(
          texCoordLocation,
          2,
          webGL.FLOAT,
          false,
          16,
          8
        );

        webGL.clearColor(0.0, 0.0, 0.0, 1.0);
        webGL.clear(webGL.COLOR_BUFFER_BIT);
        webGL.drawArrays(webGL.TRIANGLE_STRIP, 0, 4);

        const pixels = new Uint8Array(
          this.canvasProperties.height * this.canvasProperties.width * 4
        );
        webGL.readPixels(
          0,
          0,
          this.canvasProperties.height,
          this.canvasProperties.width,
          webGL.RGBA,
          webGL.UNSIGNED_BYTE,
          pixels
        );

        resolve(pixels.toString());
      };
    });
  }
}
