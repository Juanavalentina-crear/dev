import React, { useState, useEffect, useRef } from 'react';
import { Camera, Trash2, AlertCircle, CheckCircle, XCircle, BarChart3, Leaf, Recycle, RotateCw, Archive, History } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const SmartBin3DSimulator = () => {
  const [selectedWaste, setSelectedWaste] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [binStats, setBinStats] = useState({
    organic: 35,
    plastic: 45,
    paper: 60,
    glass: 20,
    metal: 30,
    unknown: 15
  });
  const [alerts, setAlerts] = useState([]);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [lidOpen, setLidOpen] = useState(false);
  const [fullBins, setFullBins] = useState([]);
  const [alertSound, setAlertSound] = useState(false);
  const [visionHistory, setVisionHistory] = useState([]);
  const [classificationHistory, setClassificationHistory] = useState([]);
  const [monitoringHistory, setMonitoringHistory] = useState([]);
  const [totalProcessed, setTotalProcessed] = useState({ organic: 0, plastic: 0, paper: 0, glass: 0, metal: 0, unknown: 0 });
  
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);

  const wasteTypes = [
    { id: 'organic', name: 'Orgánico', color: '#10b981', icon: '🍎', category: 'organic' },
    { id: 'plastic', name: 'Plástico', color: '#3b82f6', icon: '🥤', category: 'plastic' },
    { id: 'paper', name: 'Papel', color: '#f59e0b', icon: '📄', category: 'paper' },
    { id: 'glass', name: 'Vidrio', color: '#8b5cf6', icon: '🍾', category: 'glass' },
    { id: 'metal', name: 'Metal', color: '#6b7280', icon: '🥫', category: 'metal' },
    { id: 'unknown', name: 'No Aprovechables', color: '#ef4444', icon: '❓', category: 'unknown' }
  ];

  useEffect(() => {
    if (alertSound) {
      const interval = setInterval(() => {
        playBeep();
      }, 500);
      return () => clearInterval(interval);
    }
  }, [alertSound]);

  const playBeep = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'square';
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const drawBin = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const scale = 1.2;
      
      ctx.save();
      ctx.translate(centerX, centerY);
      
      const rotRad = (rotation * Math.PI) / 180;
      const skewX = Math.sin(rotRad) * 0.3;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(0, 180, 120 + Math.abs(skewX * 50), 20, 0, 0, Math.PI * 2);
      ctx.fill();
      
      if (Math.abs(rotation) > 90) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-100 * scale, -130, 200 * scale, 300);
      }
      
      const gradient = ctx.createLinearGradient(-100, 0, 100, 0);
      gradient.addColorStop(0, '#1e293b');
      gradient.addColorStop(0.3, '#334155');
      gradient.addColorStop(0.7, '#334155');
      gradient.addColorStop(1, '#1e293b');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(-80 * scale + skewX * 100, -130);
      ctx.lineTo(-100 * scale + skewX * 200, 170);
      ctx.lineTo(100 * scale + skewX * 200, 170);
      ctx.lineTo(80 * scale + skewX * 100, -130);
      ctx.closePath();
      ctx.fill();
      
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-80 * scale + skewX * 100, -130);
      ctx.lineTo(-100 * scale + skewX * 200, 170);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(80 * scale + skewX * 100, -130);
      ctx.lineTo(100 * scale + skewX * 200, 170);
      ctx.stroke();
      
      ctx.save();
      if (lidOpen) {
        ctx.translate(0, -140);
        ctx.rotate(-0.5);
      }
      
      ctx.fillStyle = '#475569';
      ctx.fillRect(-90 * scale, -140, 180 * scale, 20);
      
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-20, -150, 40, 10);
      ctx.restore();
      
      const screenGradient = ctx.createLinearGradient(0, -110, 0, -10);
      screenGradient.addColorStop(0, '#0f172a');
      screenGradient.addColorStop(1, '#1e293b');
      ctx.fillStyle = screenGradient;
      ctx.fillRect(-70 * scale, -110, 140 * scale, 100);
      
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.strokeRect(-70 * scale, -110, 140 * scale, 100);
      
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      if (isScanning) {
        ctx.fillStyle = '#3b82f6';
        ctx.font = 'bold 40px Arial';
        ctx.fillText('🔍', 0, -50);
      } else if (scanResult) {
        ctx.fillStyle = scanResult.category === 'unknown' ? '#ef4444' : '#10b981';
        ctx.font = 'bold 36px Arial';
        ctx.fillText(scanResult.icon, 0, -50);
      } else {
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 50px Arial';
        ctx.fillText('♻️', 0, -50);
      }
      
      const cameraGradient = ctx.createRadialGradient(0, 20, 0, 0, 20, 20);
      cameraGradient.addColorStop(0, '#60a5fa');
      cameraGradient.addColorStop(1, '#1e40af');
      ctx.fillStyle = cameraGradient;
      ctx.beginPath();
      ctx.arc(0, 20, 15, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(0, 20, 10, 0, Math.PI * 2);
      ctx.fill();
      
      const compartmentY = 140;
      const compartmentWidth = 30;
      const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#6b7280', '#ef4444'];
      const categories = ['organic', 'plastic', 'paper', 'glass', 'metal', 'unknown'];
      
      for (let i = 0; i < 6; i++) {
        const x = -90 + (i * 36);
        const isFull = binStats[categories[i]] >= 100;
        
        ctx.fillStyle = isFull ? '#dc2626' : colors[i];
        ctx.fillRect(x + skewX * 150, compartmentY, compartmentWidth, 40);
        
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + skewX * 150, compartmentY, compartmentWidth, 40);
        
        const fillHeight = (binStats[categories[i]] / 100) * 35;
        const fillGradient = ctx.createLinearGradient(0, compartmentY + 40, 0, compartmentY + 40 - fillHeight);
        fillGradient.addColorStop(0, colors[i]);
        fillGradient.addColorStop(1, isFull ? '#dc2626' : colors[i] + 'cc');
        ctx.fillStyle = fillGradient;
        ctx.fillRect(x + 2 + skewX * 150, compartmentY + 40 - fillHeight, compartmentWidth - 4, fillHeight);
      }
      
      for (let i = 0; i < 6; i++) {
        const ledX = -75 + (i * 30);
        const isFull = binStats[categories[i]] >= 100;
        ctx.fillStyle = isFull ? '#dc2626' : (scanResult ? '#10b981' : '#3b82f6');
        ctx.beginPath();
        ctx.arc(ledX, -120, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-110 * scale + skewX * 200, 170, 220 * scale, 20);
      
      ctx.restore();
    };
    
    drawBin();
  }, [isScanning, scanResult, rotation, binStats, lidOpen]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart(e.clientX);
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const delta = e.clientX - dragStart;
      setRotation(prev => (prev + delta * 0.5) % 360);
      setDragStart(e.clientX);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const simulateScan = (waste) => {
    const wasteCategory = waste.category;
    
    if (binStats[wasteCategory] >= 100) {
      setAlertSound(true);
      addAlert('🚨 CONTENEDOR LLENO - No se puede depositar más ' + waste.name, 'error');
      playBeep();
      setTimeout(() => setAlertSound(false), 3000);
      return;
    }
    
    setSelectedWaste(waste);
    setIsScanning(true);
    setScanResult(null);
    setLidOpen(true);
    
    addVisionHistory('Escaneando: ' + waste.icon + ' ' + waste.name);
    
    setTimeout(() => {
      setIsScanning(false);
      const result = wasteTypes.find(w => w.id === waste.id);
      setScanResult(result);
      
      addVisionHistory('✓ Identificado: ' + result.icon + ' ' + result.name);
      
      setTimeout(() => {
        if (result.category !== 'unknown') {
          const newValue = Math.min(100, binStats[result.category] + 5);
          setBinStats(prev => ({
            ...prev,
            [result.category]: newValue
          }));
          
          // Activar alarma instantáneamente si se llena
          if (newValue >= 100) {
            setAlertSound(true);
            addAlert('🔴 ALERTA: Compartimiento ' + result.name + ' LLENO (100%)', 'error');
            setFullBins(prev => [...new Set([...prev, result.category])]);
            setTimeout(() => setAlertSound(false), 5000);
          } else if (newValue > 80) {
            addAlert('🟡 Compartimiento ' + result.name + ' casi lleno (' + newValue + '%)', 'warning');
          } else {
            addAlert('✅ ' + result.name + ' clasificado correctamente', 'success');
          }
          
          setTotalProcessed(prev => ({
            ...prev,
            [result.category]: prev[result.category] + 1
          }));
          
          addClassificationHistory(result.icon + ' ' + result.name + ' → Compartimiento ' + result.name);
          addMonitoringHistory('Nivel ' + result.name + ': ' + newValue + '%');
        } else {
          const newValue = Math.min(100, binStats.unknown + 5);
          setBinStats(prev => ({
            ...prev,
            unknown: newValue
          }));
          
          // Activar alarma instantáneamente si se llena
          if (newValue >= 100) {
            setAlertSound(true);
            addAlert('🔴 ALERTA: Compartimiento No Aprovechables LLENO (100%)', 'error');
            setFullBins(prev => [...new Set([...prev, 'unknown'])]);
            setTimeout(() => setAlertSound(false), 5000);
          } else {
            addAlert('⚠️ Residuo no aprovechable depositado', 'warning');
          }
          
          setTotalProcessed(prev => ({
            ...prev,
            unknown: prev.unknown + 1
          }));
          
          addClassificationHistory('❌ ' + result.name + ' → Compartimiento No Aprovechables');
          addMonitoringHistory('Nivel No Aprovechables: ' + newValue + '%');
        }
        
        setLidOpen(false);
        
        setTimeout(() => {
          setScanResult(null);
          setSelectedWaste(null);
        }, 2000);
      }, 1000);
    }, 2000);
  };

  const emptyBin = (category) => {
    setBinStats(prev => ({ ...prev, [category]: 0 }));
    setFullBins(prev => prev.filter(b => b !== category));
    setAlertSound(false);
    const waste = wasteTypes.find(w => w.category === category);
    addAlert('🗑️ Compartimiento ' + (waste?.name || category) + ' vaciado completamente', 'success');
    addMonitoringHistory('🔄 Compartimiento ' + (waste?.name || category) + ' vaciado - Nivel: 0%');
  };

  const addAlert = (message, type) => {
    const newAlert = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    };
    setAlerts(prev => [newAlert, ...prev]);
  };

  const addVisionHistory = (message) => {
    setVisionHistory(prev => [{
      id: Date.now(),
      message,
      timestamp: new Date().toLocaleTimeString()
    }, ...prev]);
  };

  const addClassificationHistory = (message) => {
    setClassificationHistory(prev => [{
      id: Date.now(),
      message,
      timestamp: new Date().toLocaleTimeString()
    }, ...prev]);
  };

  const addMonitoringHistory = (message) => {
    setMonitoringHistory(prev => [{
      id: Date.now(),
      message,
      timestamp: new Date().toLocaleTimeString()
    }, ...prev]);
  };

  const pieData = Object.entries(totalProcessed).map(([key, value]) => {
    const waste = wasteTypes.find(w => w.category === key);
    return {
      name: waste?.name || key,
      value: value,
      color: waste?.color
    };
  }).filter(d => d.value > 0);

  const barData = Object.entries(binStats).map(([key, value]) => {
    const waste = wasteTypes.find(w => w.category === key);
    return {
      name: waste?.name || key,
      nivel: value,
      color: waste?.color
    };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Recycle className="text-green-400" size={40} />
            Caneca Inteligente 3D
          </h1>
          <p className="text-blue-200">Sistema de Clasificación Automática de Residuos con Vista 360°</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-blue-500/30">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Camera className="text-blue-400" />
                Vista 3D Interactiva - Arrastra para rotar 360°
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setRotation(0)}
                  className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/40 rounded-full border border-blue-400 transition-all"
                >
                  <RotateCw className="text-blue-300" size={16} />
                </button>
                <div className="px-3 py-1 bg-blue-500/20 rounded-full border border-blue-400">
                  <span className="text-blue-300 text-sm">● ONLINE</span>
                </div>
              </div>
            </div>
            
            <canvas 
              ref={canvasRef} 
              width={600} 
              height={500}
              className="w-full bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl cursor-grab active:cursor-grabbing"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
            
            <div className="mt-2 text-center text-sm text-gray-400">
              Rotación: {Math.round(rotation)}° | {lidOpen ? '🔓 Tapa Abierta' : '🔒 Tapa Cerrada'}
            </div>
            
            <div className="mt-6 bg-slate-900 rounded-xl p-6 border border-blue-500/50">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-blue-300 mb-4">
                  📱 Pantalla Digital de la Caneca
                </h3>
                
                {alertSound && (
                  <div className="mb-4 p-3 bg-red-500/20 border-2 border-red-500 rounded-lg animate-pulse">
                    <p className="text-red-400 font-bold text-xl">🚨 ALERTA SONORA ACTIVA 🚨</p>
                    <p className="text-red-300 text-sm">Contenedor lleno - Vaciado requerido</p>
                  </div>
                )}
                
                {isScanning && (
                  <div className="animate-pulse">
                    <div className="text-6xl mb-4">🔍</div>
                    <p className="text-2xl text-blue-400 font-bold">Escaneando...</p>
                    <p className="text-gray-400 mt-2">Analizando residuo con IA</p>
                  </div>
                )}
                
                {!isScanning && scanResult && (
                  <div className="animate-fade-in">
                    <div className="text-6xl mb-4">{scanResult.icon}</div>
                    <p className="text-3xl font-bold mb-2" style={{ color: scanResult.color }}>
                      {scanResult.name}
                    </p>
                    <p className="text-gray-300">
                      {scanResult.category === 'unknown' 
                        ? '❌ No se puede clasificar'
                        : '✓ Depositar en compartimiento ' + scanResult.name
                      }
                    </p>
                  </div>
                )}
                
                {!isScanning && !scanResult && (
                  <div>
                    <div className="text-6xl mb-4">♻️</div>
                    <p className="text-2xl text-green-400 font-bold">Sistema Listo</p>
                    <p className="text-gray-400 mt-2">Acerca un residuo para clasificar</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-blue-500/30">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Trash2 className="text-green-400" />
                Simular Clasificación
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {wasteTypes.map(waste => {
                  const isFull = binStats[waste.category] >= 100;
                  return (
                    <button
                      key={waste.id}
                      onClick={() => simulateScan(waste)}
                      disabled={isScanning || isFull}
                      className={'p-4 rounded-xl border transition-all ' + (isFull 
                          ? 'bg-red-500/20 border-red-500 cursor-not-allowed opacity-50'
                          : 'bg-slate-700/50 hover:bg-slate-700 border-slate-600 hover:border-blue-500') + (isScanning ? ' opacity-50 cursor-not-allowed' : '')}
                      style={{ borderColor: selectedWaste?.id === waste.id ? waste.color : '' }}
                    >
                      <div className="text-3xl mb-2">{waste.icon}</div>
                      <div className="text-sm text-white font-medium">{waste.name}</div>
                      {isFull && <div className="text-xs text-red-400 mt-1">LLENO</div>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-blue-500/30">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="text-blue-400" />
                Nivel de Llenado
              </h3>
              <div className="space-y-4">
                {Object.entries(binStats).map(([key, value]) => {
                  const waste = wasteTypes.find(w => w.category === key);
                  const isFull = value >= 100;
                  return (
                    <div key={key}>
                      <div className="flex justify-between items-center text-sm mb-1">
                        <span className="text-gray-300">{waste?.icon} {waste?.name || key}</span>
                        <div className="flex items-center gap-2">
                          <span className={'font-bold ' + (isFull ? 'text-red-400' : 'text-white')}>
                            {value}%
                          </span>
                          {value > 0 && (
                            <button
                              onClick={() => emptyBin(key)}
                              className="p-1 bg-red-500/20 hover:bg-red-500/40 rounded border border-red-500 transition-all"
                              title="Vaciar contenedor"
                            >
                              <Archive size={14} className="text-red-400" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className={'h-full rounded-full transition-all duration-500 ' + (isFull ? 'animate-pulse' : '')}
                          style={{ 
                            width: value + '%',
                            backgroundColor: isFull ? '#dc2626' : (waste?.color || '#6b7280')
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-blue-500/30">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <AlertCircle className="text-yellow-400" />
                Alertas del Sistema
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {alerts.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">
                    No hay alertas activas
                  </p>
                ) : (
                  alerts.slice(0, 10).map(alert => (
                    <div 
                      key={alert.id}
                      className={'p-3 rounded-lg text-sm ' + (alert.type === 'success' ? 'bg-green-500/20 border border-green-500/50' :
                        alert.type === 'warning' ? 'bg-yellow-500/20 border border-yellow-500/50' :
                        alert.type === 'error' ? 'bg-red-500/20 border border-red-500/50' :
                        'bg-blue-500/20 border border-blue-500/50')}
                    >
                      <p className="text-white font-medium">{alert.message}</p>
                      <p className="text-gray-400 text-xs mt-1">{alert.timestamp}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-blue-500/30">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Camera className="text-blue-400" />
              Historial Visión IA
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {visionHistory.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Sin actividad</p>
              ) : (
                visionHistory.map(item => (
                  <div key={item.id} className="p-2 bg-slate-700/50 rounded text-sm">
                    <p className="text-white">{item.message}</p>
                    <p className="text-gray-400 text-xs">{item.timestamp}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-green-500/30">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircle className="text-green-400" />
              Historial Clasificación
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {classificationHistory.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Sin clasificaciones</p>
              ) : (
                classificationHistory.map(item => (
                  <div key={item.id} className="p-2 bg-slate-700/50 rounded text-sm">
                    <p className="text-white">{item.message}</p>
                    <p className="text-gray-400 text-xs">{item.timestamp}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-purple-500/30">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="text-purple-400" />
              Historial Monitoreo
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {monitoringHistory.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Sin registros</p>
              ) : (
                monitoringHistory.map(item => (
                  <div key={item.id} className="p-2 bg-slate-700/50 rounded text-sm">
                    <p className="text-white">{item.message}</p>
                    <p className="text-gray-400 text-xs">{item.timestamp}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-blue-500/30">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              📊 Distribución de Residuos Procesados
            </h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center">
                <p className="text-gray-400 text-center">
                  No hay datos aún<br />
                  <span className="text-sm">Comienza a clasificar residuos para ver estadísticas</span>
                </p>
              </div>
            )}
          </div>

          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-green-500/30">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              📈 Niveles Actuales por Compartimiento
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #3b82f6',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="nivel" radius={[8, 8, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.nivel >= 100 ? '#dc2626' : entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-green-500/20 backdrop-blur rounded-xl p-4 border border-green-500/50">
            <Camera className="text-green-400 mb-2" size={32} />
            <h4 className="text-white font-semibold mb-1">Visión IA</h4>
            <p className="text-gray-300 text-sm">Identificación automática de residuos</p>
            <p className="text-green-400 font-bold mt-2">{visionHistory.length} escaneos</p>
          </div>
          <div className="bg-blue-500/20 backdrop-blur rounded-xl p-4 border border-blue-500/50">
            <CheckCircle className="text-blue-400 mb-2" size={32} />
            <h4 className="text-white font-semibold mb-1">Clasificación</h4>
            <p className="text-gray-300 text-sm">6 compartimientos inteligentes</p>
            <p className="text-blue-400 font-bold mt-2">{classificationHistory.length} clasificados</p>
          </div>
          <div className="bg-yellow-500/20 backdrop-blur rounded-xl p-4 border border-yellow-500/50">
            <AlertCircle className="text-yellow-400 mb-2" size={32} />
            <h4 className="text-white font-semibold mb-1">Alertas</h4>
            <p className="text-gray-300 text-sm">Notificaciones en tiempo real</p>
            <p className="text-yellow-400 font-bold mt-2">{alerts.length} alertas</p>
          </div>
          <div className="bg-purple-500/20 backdrop-blur rounded-xl p-4 border border-purple-500/50">
            <BarChart3 className="text-purple-400 mb-2" size={32} />
            <h4 className="text-white font-semibold mb-1">Monitoreo</h4>
            <p className="text-gray-300 text-sm">Estadísticas de uso y llenado</p>
            <p className="text-purple-400 font-bold mt-2">{monitoringHistory.length} registros</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartBin3DSimulator;