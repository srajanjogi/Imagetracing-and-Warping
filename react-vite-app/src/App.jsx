import { useState } from 'react'
import './App.css'

function App() {
  const [selectedMode, setSelectedMode] = useState('trace')
  const [selectedMediaType, setSelectedMediaType] = useState('image')
  const [showColorPopup, setShowColorPopup] = useState(false)

  const isTraceMode = selectedMode === 'trace'
  const isWarpMode = selectedMode === 'warp'
  const isImageMedia = selectedMediaType === 'image'
  const isVideoMedia = selectedMediaType === 'video'

  return (
    <div className="main-layout">
      {/* Column 1: Upload + Original */}
      <div className="column column-1">
        <div className="column-section">
          <button
            id="uploadBtn"
            className="blue-btn"
            style={{ marginBottom: 15, width: '100%' }}
          >
            Upload Image
          </button>
        </div>

        <div className="column-section">
          <div className="section-title">Original</div>
          <div className="original-image-box">
            <img id="originalPreview" alt="Original upload" />
          </div>
        </div>

      </div>

      {/* Column 2: Mode selection + main controls */}
      <div className="column column-2">
        <div className="column-section">
          <div className="section-title">Mode</div>
          <div className="mode-toggle-row">
            <button
              type="button"
              className={`blue-btn mode-toggle-btn ${
                isTraceMode ? 'selected' : ''
              }`}
              onClick={() => setSelectedMode('trace')}
            >
              Trace Image
            </button>
            <button
              type="button"
              className={`blue-btn mode-toggle-btn ${
                isWarpMode ? 'selected' : ''
              }`}
              onClick={() => setSelectedMode('warp')}
            >
              Warp Image
            </button>
          </div>
        </div>

        <div
          className="color-summary-row"
          onClick={() => setShowColorPopup(true)}
        >
          <div className="section-title" style={{ marginBottom: 0 }}>
            Color
          </div>
          <div className="color-summary-control">
            <div className="preview-bar" id="previewBar"></div>
            <input type="text" className="hex-input" id="hexText" />
          </div>
        </div>

        {/* Trace controls (always visible in column 2 when Trace mode is selected) */}
        <div
          className={`controls-left mode-trace ${
            isTraceMode ? 'is-active' : 'is-inactive'
          }`}
        >
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
          </div>
        </div>

        {/* Warp mode controls (independent of media type) */}
        <div
          className={`mode-warp ${
            isWarpMode ? 'is-active' : 'is-inactive'
          }`}
        >
          <div className="action-column">
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
          </div>
        </div>
      </div>

      {/* Column 3: Preview + Output Type + Export */}
      <div className="column column-3">
        <div className="column-section">
          <div className="section-title">Preview</div>
          <div className="img-container" id="imgContainer">
            <canvas id="imageCanvas"></canvas>
            <canvas id="overlayCanvas"></canvas>
          </div>
        </div>

        <div className="column-section">
          <div className="section-title">Output Type</div>
          <div className="media-toggle-row">
            <button
              type="button"
              className={`blue-btn media-toggle-btn ${
                isImageMedia ? 'selected' : ''
              }`}
              onClick={() => setSelectedMediaType('image')}
            >
              Image
            </button>
            <button
              type="button"
              className={`blue-btn media-toggle-btn ${
                isVideoMedia ? 'selected' : ''
              }`}
              onClick={() => setSelectedMediaType('video')}
            >
              Video
            </button>
          </div>
        </div>

        {/* Trace + Video controls now shown in column 3 */}
        <div
          className={`mode-trace media-video ${
            isTraceMode && isVideoMedia ? 'is-active' : 'is-inactive'
          }`}
        >
          <div className="action-column">
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
          </div>
        </div>

        <div className="zoom-section" style={{ display: 'none' }}>
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

        <div className="export-section">
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
                Export type:
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
                <span id="currentFormatLabel">Export type ▼</span>
              </div>
              <div className="export-menu">
                {isImageMedia && (
                  <>
                    <div
                      className="menu-item"
                      onMouseEnter={() =>
                        window.showDuration && window.showDuration(false)
                      }
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
                  </>
                )}

                {isVideoMedia && (
                  <div
                    className="menu-item"
                    onMouseEnter={() =>
                      window.showDuration && window.showDuration(true)
                    }
                    onClick={() =>
                      window.selectFormat && window.selectFormat('webm')
                    }
                  >
                    WebM
                  </div>
                )}
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

        <canvas id="recorderCanvas" style={{ display: 'none' }}></canvas>
      </div>

      {/* Color editor popup (always in DOM so legacy JS can bind), visibility via CSS */}
      <div
        className={`color-modal-backdrop ${
          showColorPopup ? 'color-modal-open' : ''
        }`}
        onClick={() => setShowColorPopup(false)}
      >
        <div
          className="color-modal"
          onClick={(e) => {
            e.stopPropagation()
          }}
        >
          <div className="editor-panel">
            <div className="header-title">Edit colours</div>
            <div className="picker-row">
              <div className="color-square" id="rainbowSquare">
                <div className="white-layer"></div>
                <div id="squareCursor"></div>
                <div id="colorTooltip"></div>
              </div>
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
          <div style={{ textAlign: 'right', marginTop: 10 }}>
            <button
              type="button"
              className="blue-btn"
              onClick={() => setShowColorPopup(false)}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
