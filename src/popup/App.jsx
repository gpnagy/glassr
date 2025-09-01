import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Slider,
  Tabs,
  Tab,
  Stack,
  Grid,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  TextField
} from '@mui/material';

// --- Predefined Background Options ---
const wallpapers = [
  'https://source.unsplash.com/random/800x600?nature',
  'https://source.unsplash.com/random/800x600?water',
  'https://source.unsplash.com/random/800x600?city',
  'https://source.unsplash.com/random/800x600?space',
];
const gradients = [
  'linear-gradient(to right, #ff7e5f, #feb47b)',
  'linear-gradient(to right, #6a11cb, #2575fc)',
  'linear-gradient(to right, #fc00ff, #00dbde)',
  'linear-gradient(to right, #00c9ff, #92fe9d)',
];
const solidColors = ['#FFFFFF', '#000000', '#FF5733', '#33FF57'];

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

function App() {
  const canvasRef = useRef(null);
  const [croppedImage, setCroppedImage] = useState(null);
  const [imageObject, setImageObject] = useState(null);

  // Styling State
  const [padding, setPadding] = useState(40);
  const [borderRadius, setBorderRadius] = useState(20);
  const [shadow, setShadow] = useState(25);
  const [aspectRatio, setAspectRatio] = useState('auto');

  // Background State
  const [activeTab, setActiveTab] = useState(0);
  const [background, setBackground] = useState(gradients[0]);
  const [customColor, setCustomColor] = useState('#aabbcc');

  // Load settings and image from storage
  useEffect(() => {
    chrome.storage.local.get(['userSettings', 'croppedImage'], (result) => {
      if (result.userSettings) {
        setPadding(result.userSettings.padding ?? 40);
        setBorderRadius(result.userSettings.borderRadius ?? 20);
        setShadow(result.userSettings.shadow ?? 25);
        setBackground(result.userSettings.background ?? gradients[0]);
        setAspectRatio(result.userSettings.aspectRatio ?? 'auto');
      }
      if (result.croppedImage) {
        setCroppedImage(result.croppedImage);
        const img = new Image();
        img.src = result.croppedImage;
        img.onload = () => setImageObject(img);
      }
    });
  }, []);

  // Save settings when they change
  useEffect(() => {
    const settings = { padding, borderRadius, shadow, background, aspectRatio };
    chrome.storage.local.set({ userSettings: settings });
  }, [padding, borderRadius, shadow, background, aspectRatio]);

  // Core drawing logic
  useEffect(() => {
    if (!imageObject || !canvasRef.current) return;
    drawCanvas();
  }, [imageObject, padding, borderRadius, shadow, background]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageObject;

    const canvasWidth = img.width + padding * 2;
    const canvasHeight = img.height + padding * 2;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (background.startsWith('linear-gradient')) {
        const match = background.match(/linear-gradient\(to right, (.*?), (.*?)\)/);
        if (match) {
            const [, color1, color2] = match;
            const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
            grad.addColorStop(0, color1.trim());
            grad.addColorStop(1, color2.trim());
            ctx.fillStyle = grad;
        }
    } else if (background.startsWith('http')) {
        const wallpaperImg = new Image();
        wallpaperImg.crossOrigin = 'anonymous';
        wallpaperImg.src = background;
        wallpaperImg.onload = () => {
            ctx.drawImage(wallpaperImg, 0, 0, canvas.width, canvas.height);
            drawForeground(ctx, img);
        }
        ctx.fillStyle = '#eee';
    } else {
      ctx.fillStyle = background;
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawForeground(ctx, img);
  };

  function drawForeground(ctx, img) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = shadow * 1.5;
    ctx.shadowOffsetY = shadow / 2;
    const r = borderRadius > Math.min(img.width, img.height) / 2 ? Math.min(img.width, img.height) / 2 : borderRadius;
    const x = padding;
    const y = padding;
    const w = img.width;
    const h = img.height;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, x, y);
    ctx.restore();
  }

  const handleNewCapture = () => {
    chrome.runtime.sendMessage({
      type: 'INITIATE_CAPTURE',
      payload: { aspectRatio }
    }, () => window.close());
  };

  const handleDownload = () => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      chrome.runtime.sendMessage({
        type: 'DOWNLOAD_IMAGE',
        payload: { dataUrl }
      });
    }
  };

  return (
    <Container sx={{ width: 380, p: 2 }}>
      <Stack spacing={2}>
        <Box sx={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 2, overflow: 'auto' }}>
          {imageObject ? <canvas ref={canvasRef} style={{ maxWidth: '100%', maxHeight: '100%' }} /> : <Typography sx={{color: 'white'}}>Capture an area to begin</Typography>}
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <ToggleButtonGroup color="primary" value={aspectRatio} exclusive onChange={(e, newRatio) => {if (newRatio) setAspectRatio(newRatio)}} >
              <ToggleButton value="auto">Auto</ToggleButton>
              <ToggleButton value="16:9">16:9</ToggleButton>
              <ToggleButton value="4:3">4:3</ToggleButton>
              <ToggleButton value="1:1">1:1</ToggleButton>
            </ToggleButtonGroup>
        </Box>
        <Paper elevation={4} sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', borderRadius: 2 }}>
          <Stack spacing={2}>
            <Box><Typography gutterBottom>Padding</Typography><Slider value={padding} onChange={(e, val) => setPadding(val)} min={0} max={150} /></Box>
            <Box><Typography gutterBottom>Corners</Typography><Slider value={borderRadius} onChange={(e, val) => setBorderRadius(val)} min={0} max={100} /></Box>
            <Box><Typography gutterBottom>Shadow</Typography><Slider value={shadow} onChange={(e, val) => setShadow(val)} min={0} max={100} /></Box>
          </Stack>
        </Paper>
        <Paper elevation={4} sx={{ bgcolor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', borderRadius: 2 }}>
          <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)} centered><Tab label="Gradients" /><Tab label="Colors" /><Tab label="Wallpapers" /></Tabs>
          <TabPanel value={activeTab} index={0}><Grid container spacing={1}>{gradients.map(g => <Grid item xs={6} key={g}><Box sx={{ height: 40, background: g, borderRadius: 1, cursor: 'pointer' }} onClick={() => setBackground(g)} /></Grid>)}</Grid></TabPanel>
          <TabPanel value={activeTab} index={1}><Stack direction="row" spacing={1} alignItems="center"><Grid container spacing={1}>{solidColors.map(c => <Grid item xs={3} key={c}><Box sx={{ height: 40, background: c, borderRadius: 1, cursor: 'pointer', border: '1px solid #ddd' }} onClick={() => setBackground(c)} /></Grid>)}</Grid><input type="color" value={customColor} onChange={(e) => { setCustomColor(e.target.value); setBackground(e.target.value); }} style={{width: 40, height: 40, border: 'none', background: 'none', cursor: 'pointer'}}/></Stack></TabPanel>
          <TabPanel value={activeTab} index={2}><Grid container spacing={1}>{wallpapers.map(wp => <Grid item xs={3} key={wp}><img src={wp} width="100%" height="40" style={{objectFit: 'cover', borderRadius: 4, cursor: 'pointer'}} onClick={() => setBackground(wp)} /></Grid>)}</Grid></TabPanel>
        </Paper>
        <Button variant="contained" onClick={handleDownload} disabled={!imageObject}>Download</Button>
        <Button variant="outlined" onClick={handleNewCapture} sx={{color: 'white', borderColor: 'white'}}>Capture New Area</Button>
      </Stack>
    </Container>
  );
}

export default App;
