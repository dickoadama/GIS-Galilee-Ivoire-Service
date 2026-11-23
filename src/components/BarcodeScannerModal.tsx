import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Barcode,
  Camera,
  Check,
  ImageUp,
  Link2,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  ShoppingBag,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { BrowserCodeReader, BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { Product, ProductPole, StoreSettings, UserRole } from '../types/app';
import { formatFcfa, getPoleLabel } from '../utils/formatters';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  products: Product[];
  settings: StoreSettings;
  currentRole: UserRole;
  onClose: () => void;
  onUpdateProduct?: (product: Product) => void;
  onAddToCart: (productId: string, quantity: number) => void;
  onOpenEditorForProduct: (product: Product) => void;
  onCreateProductWithBarcode: (barcode: string) => void;
}

function playScanBeep() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(920, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    setTimeout(() => {
      void ctx.close();
    }, 250);
  } catch {
    // Ignore audio context restrictions
  }
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  products,
  settings,
  currentRole,
  onClose,
  onUpdateProduct,
  onAddToCart,
  onOpenEditorForProduct,
  onCreateProductWithBarcode,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastScanRef = useRef<{ code: string; time: number }>({
    code: '',
    time: 0,
  });

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraActive, setCameraActive] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const [manualCode, setManualCode] = useState<string>('');
  const [scannedCode, setScannedCode] = useState<string>('');
  const [exactStockInput, setExactStockInput] = useState<string>('');
  const [stockNotice, setStockNotice] = useState<string | null>(null);
  const [assignProductId, setAssignProductId] = useState<string>('');

  const canManagePole = useCallback(
    (pole: ProductPole) => {
      if (currentRole === 'super_admin' || currentRole === 'admin_patron') {
        return true;
      }
      if (
        currentRole === 'gerant_ciment' &&
        (pole === 'ciment' || pole === 'quincaillerie')
      ) {
        return true;
      }
      if (currentRole === 'gerant_boisson' && pole === 'boissons') {
        return true;
      }
      return false;
    },
    [currentRole]
  );

  const manageableProducts = useMemo(
    () => products.filter((p) => canManagePole(p.pole)),
    [products, canManagePole]
  );

  const matchedProduct = useMemo(() => {
    const clean = scannedCode.trim().toLowerCase();
    if (!clean) return null;
    return (
      products.find(
        (p) =>
          (p.barcode && p.barcode.trim().toLowerCase() === clean) ||
          p.id.toLowerCase() === clean
      ) ?? null
    );
  }, [products, scannedCode]);

  useEffect(() => {
    if (matchedProduct) {
      setExactStockInput(String(matchedProduct.stockQty));
    } else {
      setExactStockInput('');
    }
  }, [matchedProduct]);

  useEffect(() => {
    if (!assignProductId && manageableProducts.length > 0) {
      setAssignProductId(manageableProducts[0].id);
    }
  }, [assignProductId, manageableProducts]);

  const handleDetectedCode = useCallback(
    (rawCode: string, fromCamera = false) => {
      const clean = rawCode.trim();
      if (!clean) return;

      const now = Date.now();
      if (
        fromCamera &&
        lastScanRef.current.code === clean &&
        now - lastScanRef.current.time < 1800
      ) {
        return;
      }
      lastScanRef.current = { code: clean, time: now };

      setScannedCode(clean);
      setManualCode(clean);
      setStockNotice(null);
      if (soundEnabled) {
        playScanBeep();
      }
    },
    [soundEnabled]
  );

  const stopCameraStream = useCallback(() => {
    if (controlsRef.current) {
      try {
        controlsRef.current.stop();
      } catch {
        // Ignore cleanup errors
      }
      controlsRef.current = null;
    }
    try {
      BrowserCodeReader.releaseAllStreams();
    } catch {
      // Ignore cleanup errors
    }
  }, []);

  // Load camera list when opened
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const loadCameras = async () => {
      try {
        const list = await BrowserCodeReader.listVideoInputDevices();
        if (cancelled) return;
        setDevices(list);
      } catch {
        // Device enumeration may wait until permission granted
      }
    };

    void loadCameras();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Start / manage live camera scanner
  useEffect(() => {
    if (!isOpen || !cameraActive) {
      stopCameraStream();
      return;
    }

    let cancelled = false;
    const reader = new BrowserMultiFormatReader();

    const startScanner = async () => {
      setCameraError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          'La caméra n’est pas disponible dans ce navigateur. Utilisez la saisie manuelle ou l’import d’une photo.'
        );
        return;
      }

      const videoEl = videoRef.current;
      if (!videoEl) return;

      try {
        const constraints: MediaStreamConstraints = {
          audio: false,
          video: selectedDeviceId
            ? { deviceId: { exact: selectedDeviceId } }
            : { facingMode: { ideal: 'environment' } },
        };

        const controls = await reader.decodeFromConstraints(
          constraints,
          videoEl,
          (result) => {
            if (cancelled || !result) return;
            handleDetectedCode(result.getText(), true);
          }
        );

        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;

        // Refresh camera labels after permission is granted
        try {
          const updatedList = await BrowserCodeReader.listVideoInputDevices();
          if (!cancelled) setDevices(updatedList);
        } catch {
          // Non-blocking
        }
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof Error ? err.name : '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setCameraError(
            'Accès caméra refusé. Autorisez la caméra dans le navigateur ou utilisez le champ code-barres / photo ci-dessous.'
          );
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setCameraError(
            'Aucune caméra détectée sur cet appareil. Utilisez une douchette USB, le champ manuel ou une photo.'
          );
        } else {
          setCameraError(
            'Impossible de démarrer la caméra pour le moment. Utilisez la saisie manuelle ou l’import photo.'
          );
        }
      }
    };

    void startScanner();

    return () => {
      cancelled = true;
      stopCameraStream();
    };
  }, [isOpen, cameraActive, selectedDeviceId, handleDetectedCode, stopCameraStream]);

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCameraError(null);

    const objectUrl = URL.createObjectURL(file);
    try {
      const imgReader = new BrowserMultiFormatReader();
      const result = await imgReader.decodeFromImageUrl(objectUrl);
      handleDetectedCode(result.getText(), false);
    } catch {
      setCameraError(
        'Aucun code-barres détecté sur cette photo. Essayez un cadrage plus net et bien éclairé.'
      );
    } finally {
      URL.revokeObjectURL(objectUrl);
      e.target.value = '';
    }
  };

  const applyStockDelta = (product: Product, delta: number) => {
    if (!onUpdateProduct) return;
    const nextQty = Math.max(0, product.stockQty + delta);
    onUpdateProduct({
      ...product,
      stockQty: nextQty,
      inStock: nextQty > 0,
      updatedAt: new Date().toISOString(),
    });
    setExactStockInput(String(nextQty));
    setStockNotice(`Stock mis à jour : ${nextQty} ${product.unitLabel}`);
  };

  const applyExactStock = (e: React.FormEvent, product: Product) => {
    e.preventDefault();
    if (!onUpdateProduct) return;
    const parsed = Math.max(0, Math.round(Number(exactStockInput) || 0));
    onUpdateProduct({
      ...product,
      stockQty: parsed,
      inStock: parsed > 0,
      updatedAt: new Date().toISOString(),
    });
    setStockNotice(`Stock défini à ${parsed} ${product.unitLabel}`);
  };

  const handleAssignBarcodeToProduct = () => {
    if (!onUpdateProduct || !scannedCode.trim() || !assignProductId) return;
    const target = manageableProducts.find((p) => p.id === assignProductId);
    if (!target) return;
    onUpdateProduct({
      ...target,
      barcode: scannedCode.trim().slice(0, 64),
      updatedAt: new Date().toISOString(),
    });
    setStockNotice(
      `Code-barres ${scannedCode.trim()} associé à ${target.name}`
    );
  };

  const handleClose = () => {
    stopCameraStream();
    onClose();
  };

  const threshold = matchedProduct?.criticalStockThreshold ?? 15;
  const isCritical = matchedProduct
    ? matchedProduct.stockQty < threshold
    : false;
  const isOutOfStock = matchedProduct ? matchedProduct.stockQty === 0 : false;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="barcode-scanner-title"
    >
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Barcode className="w-5 h-5 text-[#D9531E] shrink-0" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Identification produit & inventaire rapide
              </p>
              <h2
                id="barcode-scanner-title"
                className="font-display font-bold text-lg"
              >
                Scanner de codes-barres (Caméra & Douchette)
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Fermer le scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Split Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
          {/* Left: Live Camera Viewfinder + Manual/Photo Controls */}
          <div className="p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Visée caméra en direct
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSoundEnabled((v) => !v)}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  title={
                    soundEnabled
                      ? 'Couper le bip de scan'
                      : 'Activer le bip de scan'
                  }
                >
                  {soundEnabled ? (
                    <Volume2 className="w-4 h-4" />
                  ) : (
                    <VolumeX className="w-4 h-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setCameraActive((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                >
                  {cameraActive ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      Activer caméra
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Video Container */}
            <div className="relative aspect-16/10 w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  cameraActive && !cameraError ? 'opacity-100' : 'opacity-20'
                }`}
              />

              {/* Targeting Reticle */}
              {cameraActive && !cameraError && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="w-3/4 h-1/2 relative border border-white/25 rounded-lg">
                    <span className="absolute -top-0.5 -left-0.5 w-5 h-5 border-t-2 border-l-2 border-[#D9531E] rounded-tl" />
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 border-t-2 border-r-2 border-[#D9531E] rounded-tr" />
                    <span className="absolute -bottom-0.5 -left-0.5 w-5 h-5 border-b-2 border-l-2 border-[#D9531E] rounded-bl" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 border-b-2 border-r-2 border-[#D9531E] rounded-br" />
                    <div className="absolute inset-x-3 top-1/2 h-0.5 bg-[#D9531E]/80" />
                  </div>
                </div>
              )}

              {(!cameraActive || cameraError) && (
                <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center gap-2 bg-slate-950/75 text-white">
                  <Camera className="w-8 h-8 text-slate-400" />
                  <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
                    {cameraError ||
                      'Caméra en pause. Cliquez sur « Activer caméra » ou saisissez un code-barres ci-dessous.'}
                  </p>
                </div>
              )}
            </div>

            {/* Camera Selection + Image Scan Fallback */}
            <div className="flex flex-wrap items-center gap-2">
              {devices.length > 1 && (
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  aria-label="Choisir la caméra"
                  className="flex-1 min-w-[160px] px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                >
                  <option value="">Caméra arrière (automatique)</option>
                  {devices.map((dev, idx) => (
                    <option key={dev.deviceId} value={dev.deviceId}>
                      {dev.label || `Caméra ${idx + 1}`}
                    </option>
                  ))}
                </select>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <ImageUp className="w-3.5 h-3.5" />
                Scanner depuis une photo
              </button>
            </div>

            {/* Manual Entry / USB Barcode Gun Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleDetectedCode(manualCode, false);
              }}
              className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2"
            >
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Saisie manuelle ou douchette USB
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Ex. 6181000100014 ou 5449000054227"
                  className="flex-1 px-3 py-2 text-sm font-mono-tabular bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-[#D9531E]"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0F2342] hover:bg-[#1A355E] dark:bg-[#D9531E] dark:hover:bg-[#B84315] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Search className="w-3.5 h-3.5" />
                  Identifier
                </button>
              </div>
            </form>
          </div>

          {/* Right: Identified Product & Rapid Stock Update */}
          <div className="p-6 flex flex-col justify-between gap-5">
            {!scannedCode ? (
              <div className="my-auto text-center space-y-3 py-8">
                <Barcode className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                <div className="space-y-1">
                  <p className="font-display font-bold text-base text-slate-900 dark:text-white">
                    Prêt pour le scan produit
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                    Placez le code-barres face à la caméra ou scannez avec votre douchette pour afficher la fiche produit et ajuster le stock en 1 clic.
                  </p>
                </div>
              </div>
            ) : matchedProduct ? (
              <div className="space-y-5">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-[#D9531E]">
                      {getPoleLabel(matchedProduct.pole)} · {matchedProduct.category}
                    </span>
                    <span className="font-mono-tabular">
                      Code : {matchedProduct.barcode || matchedProduct.id}
                    </span>
                  </div>
                  <h3 className="font-display font-extrabold text-xl text-slate-900 dark:text-white leading-snug">
                    {matchedProduct.name}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {matchedProduct.unitLabel} · Détail :{' '}
                    <strong className="font-mono-tabular text-slate-900 dark:text-white">
                      {formatFcfa(matchedProduct.priceFcfa, settings.currencyLabel)}
                    </strong>{' '}
                    · Gros :{' '}
                    <strong className="font-mono-tabular text-emerald-700 dark:text-emerald-400">
                      {formatFcfa(
                        matchedProduct.wholesalePriceFcfa,
                        settings.currencyLabel
                      )}
                    </strong>
                  </p>
                </div>

                {/* Stock Status & Alert Box */}
                <div
                  className={`rounded-xl border p-4 space-y-2 ${
                    isOutOfStock
                      ? 'bg-red-50/60 dark:bg-red-950/25 border-red-300 dark:border-red-800'
                      : isCritical
                        ? 'bg-amber-50/60 dark:bg-amber-950/25 border-amber-300 dark:border-amber-700'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Quantité actuelle en stock
                    </span>
                    <span className="font-mono-tabular font-extrabold text-2xl text-slate-900 dark:text-white">
                      {matchedProduct.stockQty}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-mono-tabular">
                      Seuil critique : {threshold}
                    </span>
                    {isOutOfStock ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-red-700 dark:text-red-400">
                        <AlertOctagon className="w-3.5 h-3.5" />
                        Rupture de stock
                      </span>
                    ) : isCritical ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Sous le seuil critique
                      </span>
                    ) : (
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        Niveau nominal
                      </span>
                    )}
                  </div>
                </div>

                {stockNotice && (
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <Check className="w-4 h-4 shrink-0" />
                    {stockNotice}
                  </p>
                )}

                {/* Quick Stock Update for Authorized Staff */}
                {canManagePole(matchedProduct.pole) && onUpdateProduct ? (
                  <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Mise à jour rapide du stock
                    </p>
                    <div className="grid grid-cols-5 gap-2">
                      {[-10, -1, 1, 10, 25].map((delta) => (
                        <button
                          key={delta}
                          type="button"
                          disabled={delta < 0 && matchedProduct.stockQty === 0}
                          onClick={() => applyStockDelta(matchedProduct, delta)}
                          className={`py-2 text-xs font-mono-tabular font-bold rounded-lg border transition-colors cursor-pointer disabled:opacity-40 ${
                            delta > 0
                              ? 'bg-[#0F2342] text-white border-[#0F2342] hover:bg-[#1A355E] dark:bg-[#D9531E] dark:border-[#D9531E] dark:hover:bg-[#B84315]'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                          }`}
                        >
                          {delta > 0 ? `+${delta}` : delta}
                        </button>
                      ))}
                    </div>

                    <form
                      onSubmit={(e) => applyExactStock(e, matchedProduct)}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="number"
                        min={0}
                        value={exactStockInput}
                        onChange={(e) => setExactStockInput(e.target.value)}
                        aria-label="Nouvelle quantité exacte"
                        className="w-28 px-3 py-2 text-sm font-mono-tabular font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                      />
                      <button
                        type="submit"
                        className="flex-1 py-2 px-4 text-xs font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Appliquer quantité exacte
                      </button>
                    </form>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Identification réussie. Connectez-vous en tant que gérant de ce pôle ou Patron pour modifier la quantité en stock.
                  </p>
                )}

                {/* Actions Footer */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  {canManagePole(matchedProduct.pole) && (
                    <button
                      type="button"
                      onClick={() => {
                        stopCameraStream();
                        onOpenEditorForProduct(matchedProduct);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Modifier fiche & seuil
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onAddToCart(matchedProduct.id, 1);
                      setStockNotice(`${matchedProduct.name} ajouté au panier`);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#D9531E] hover:bg-[#B84315] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Ajouter au panier (+1)
                  </button>
                </div>
              </div>
            ) : (
              /* Unknown Barcode — Bind to Existing Product or Create New */
              <div className="space-y-4">
                <div className="bg-amber-50/60 dark:bg-amber-950/25 border border-amber-300 dark:border-amber-700 rounded-xl p-4 space-y-1">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                    Code-barres non encore associé
                  </p>
                  <p className="font-mono-tabular font-bold text-base text-slate-900 dark:text-white">
                    {scannedCode}
                  </p>
                </div>

                {manageableProducts.length > 0 && onUpdateProduct ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Associer ce code-barres à un produit existant
                      </label>
                      <select
                        value={assignProductId}
                        onChange={(e) => setAssignProductId(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                      >
                        {manageableProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            [{getPoleLabel(p.pole)}] {p.name} (Stock : {p.stockQty})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAssignBarcodeToProduct}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0F2342] hover:bg-[#1A355E] rounded-lg transition-colors cursor-pointer"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        Lier le code-barres à ce produit
                      </button>
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          stopCameraStream();
                          onCreateProductWithBarcode(scannedCode);
                        }}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#D9531E] hover:bg-[#B84315] rounded-lg transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Créer un nouvel article avec ce code
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Aucun produit du catalogue ne correspond à ce code-barres. Connectez-vous avec un compte gérant ou Patron pour associer ce code à un article.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
