import './App.css'

function App() {
  return (
    <div className="main-layout">
      <div className="editor-panel">
        <div className="header-title">Edit colours</div>
        <div className="picker-row">
          <div className="color-square" id="rainbowSquare">
            <div className="white-layer"></div>
            <div id="squareCursor"></div>
            <div id="colorTooltip"></div>
          </div>
          <div className="preview-bar" id="previewBar"></div>
          <div className="hue-container">
            <input
              type="range"
              min="0"
              max="100"
              defaultValue="0"
              className="darkness-slider"
              id="darknessSlider"
            />
          </div>
          <div className="input-column">
            <input type="text" className="hex-input" id="hexText" />
            <div className="rgb-group">
              <span>Red</span>
              <input type="number" id="rNum" />
            </div>
            <div className="rgb-group">
              <span>Green</span>
              <input type="number" id="gNum" />
            </div>
            <div className="rgb-group">
              <span>Blue</span>
              <input type="number" id="bNum" />
            </div>
          </div>
        </div>
        <div className="palette-container">
          <div className="circle-grid" id="basicGrid"></div>
        </div>
      </div>

      <div className="image-panel">
        <button id="uploadBtn" className="blue-btn" style={{ marginBottom: 15 }}>
          Upload Image
        </button>
        <div className="img-container" id="imgContainer">
          <canvas id="imageCanvas"></canvas>
          <canvas id="overlayCanvas"></canvas>
        </div>

        <div className="image-bottom-row">
          <div className="controls-left">
            <div className="top-btn-row">
              <div className="edge-section">
                <button id="edgeBtn" className="blue-btn pair-btn">
                  Detect Edges
                </button>
                <label id="strengthCheckLabel">
                  <input type="checkbox" id="toggleSlider" /> Edge Detection Level
                </label>
                <div id="sliderContainer">
                  <input
                    type="range"
                    id="edgeStrength"
                    min="1"
                    max="150"
                    defaultValue="40"
                    style={{ width: '100%' }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 11,
                      color: '#666',
                    }}
                  >
                    <span>Weak</span>
                    <span id="strengthText">Level: 40</span>
                    <span>Strong</span>
                  </div>
                </div>
                <button
                  id="objDetectBtn"
                  className="blue-btn pair-btn"
                  style={{ width: 'auto', padding: '10px 15px' }}
                >
                  Detect Objects
                </button>
              </div>

              <button id="grayEdgeBtn" className="blue-btn pair-btn">
                Gray Edges
              </button>

              <button id="bgToggleBtn" className="blue-btn pair-btn">
                BG: Black
              </button>
            </div>

            <div className="action-column">
              <div style={{ fontSize: 12, fontWeight: 'bold', color: '#444' }}>
                Drawing Tool:
              </div>
              <div className="tool-selector">
                <div className="tool-icon selected" data-tool="pencil" title="Pencil">
                  ✍️
                </div>
                <div className="tool-icon" data-tool="pen" title="Pen">
                  🖊️
                </div>
              </div>

              <div className="time-selector">
                Video Duration:
                <select id="videoTime">
                  <option value="5">5 Seconds</option>
                  <option value="10" defaultValue>
                    10 Seconds
                  </option>
                  <option value="15">15 Seconds</option>
                  <option value="20">20 Seconds</option>
                </select>
              </div>

              <button id="timelapseBtn" className="blue-btn">
                Create Timelapse
              </button>
              <button id="stopSaveBtn" className="stop-btn" disabled>
                Save Video
              </button>
              <button id="warpBtn" className="blue-btn">
                Warp Image
              </button>
              <div
                id="warpOptions"
                style={{ marginTop: 5, display: 'none', gap: 8, flexWrap: 'wrap' }}
              >
                <button className="blue-btn warp-type" data-type="fisheye">
                  Fisheye
                </button>
                <button className="blue-btn warp-type" data-type="twist">
                  Twist
                </button>
                <button className="blue-btn warp-type" data-type="bulge">
                  Bulge
                </button>
                <button className="blue-btn warp-type" data-type="pinch">
                  Pinch
                </button>
                <button className="blue-btn warp-type" data-type="wave">
                  Wave
                </button>
                <button className="blue-btn warp-type" data-type="ripple">
                  Ripple
                </button>
                <button className="blue-btn warp-type" data-type="swirl">
                  swirl
                </button>
                <button className="blue-btn warp-type" data-type="mesh">
                  Mesh
                </button>
                <button id="resetWarpBtn" className="stop-btn">
                  Reset
                </button>
              </div>
              <div id="meshSliderBox" style={{ display: 'none', width: 160 }}>
                <label style={{ fontSize: 12 }}>
                  Mesh Grid: <span id="meshValue">4 × 4</span>
                </label>
                <input
                  type="range"
                  id="meshSlider"
                  min="3"
                  max="8"
                  defaultValue="4"
                  style={{ width: '100%' }}
                />
                <div
                  style={{
                    marginTop: 6,
                    display: 'flex',
                    gap: 6,
                    fontSize: 12,
                  }}
                >
                  <label>
                    R:
                    <input
                      type="number"
                      id="meshRowsInput"
                      min="2"
                      max="12"
                      defaultValue="4"
                      style={{ width: 48 }}
                    />
                  </label>
                  <label>
                    C:
                    <input
                      type="number"
                      id="meshColsInput"
                      min="2"
                      max="12"
                      defaultValue="4"
                      style={{ width: 48 }}
                    />
                  </label>
                </div>
              </div>

              <div style={{ marginTop: 15 }}>
                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-end',
                  }}
                >
                  <div className="export-wrapper">
                    <label
                      style={{
                        fontSize: 11,
                        display: 'block',
                        marginBottom: 2,
                      }}
                    >
                      Format:
                    </label>
                    <div
                      className="blue-btn"
                      style={{
                        background: '#eee',
                        color: '#333',
                        border: '1px solid #ccc',
                        minWidth: 110,
                      }}
                    >
                      <span id="currentFormatLabel">Select... ▼</span>
                    </div>
                    <div className="export-menu">
                      <div
                        className="menu-item"
                        onMouseEnter={() =>
                          window.showDuration && window.showDuration(false)
                        }
                      >
                        🖼️ Image <span>▶</span>
                        <div className="sub-menu">
                          <div
                            className="menu-item"
                            onClick={() =>
                              window.selectFormat && window.selectFormat('png')
                            }
                          >
                            PNG
                          </div>
                          <div
                            className="menu-item"
                            onClick={() =>
                              window.selectFormat && window.selectFormat('jpg')
                            }
                          >
                            JPG
                          </div>
                          <div
                            className="menu-item"
                            onClick={() =>
                              window.selectFormat && window.selectFormat('json')
                            }
                          >
                            JSON
                          </div>
                        </div>
                      </div>
                      <div
                        className="menu-item"
                        onMouseEnter={() =>
                          window.showDuration && window.showDuration(true)
                        }
                      >
                        🎥 Video <span>▶</span>
                        <div className="sub-menu">
                          <div
                            className="menu-item"
                            onClick={() =>
                              window.selectFormat && window.selectFormat('webm')
                            }
                          >
                            WebM
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div id="durationBox">
                    <label>Sec: </label>
                    <input
                      type="number"
                      id="videoTimeInput"
                      defaultValue="10"
                      min="1"
                    />
                  </div>
                  <button
                    id="exportMainBtn"
                    className="blue-btn"
                    onClick={() =>
                      window.executeExport && window.executeExport()
                    }
                  >
                    Export
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="zoom-section">
            <div id="zoomWindow">
              <canvas id="zoomCanvas" width="15" height="15"></canvas>
              <div className="crosshair-h"></div>
              <div className="crosshair-v"></div>
            </div>
            <div
              id="pixelCoords"
              style={{ fontSize: 10, color: '#666', marginTop: 4 }}
            >
              X: 0, Y: 0
            </div>
          </div>
        </div>
      </div>

      <canvas id="recorderCanvas" style={{ display: 'none' }}></canvas>
    </div>
  )
}

export default App
