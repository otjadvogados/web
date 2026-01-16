import { useState, useRef, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import UploadOutlined from '@ant-design/icons/UploadOutlined';
import AudioOutlined from '@ant-design/icons/AudioOutlined';
import CircularProgress from '@mui/material/CircularProgress';
import { transcribeFile, TranscriptionRecord, TranscribeRequestParams } from 'api/aiTranscribe';
import { openSnackbar } from 'api/snackbar';
import { listCustomersAdvanced, type Customer, sortCustomersMatrizFilialPF } from 'api/customers';
import useDebounced from 'utils/useDebounced';

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: (record: TranscriptionRecord) => void;
};

type CustomerOption = Pick<Customer, 'id' | 'displayName' | 'name' | 'kind' | 'isMatriz' | 'isFilial'>;

const labelCustomer = (c?: CustomerOption | null) => (c?.displayName ?? c?.name ?? '');

export default function TranscriptionUploadDialog({ open, onClose, onSuccess }: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  
  // Customer selection
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const debouncedCustomerSearch = useDebounced(customerSearchTerm);
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  useEffect(() => {
    if (!open) {
      // Reset form when dialog closes
      setSelectedFile(null);
      setIsSubmitting(false);
      setSelectedCustomer(null);
      setCustomerSearchTerm('');
    }
  }, [open]);

  // Load customers when search term changes
  useEffect(() => {
    (async () => {
      try {
        setLoadingCustomers(true);
        const res = await listCustomersAdvanced({
          page: 1,
          limit: 20,
          search: debouncedCustomerSearch || undefined,
          includeHierarchy: true
        });
        const list = (res?.data ?? []) as CustomerOption[];
        setCustomerOptions(sortCustomersMatrizFilialPF(list));
      } catch (err: any) {
        openSnackbar({
          open: true,
          message: err?.response?.data?.message || 'Falha ao buscar clientes',
          variant: 'alert',
          alert: { color: 'error' }
        } as any);
      } finally {
        setLoadingCustomers(false);
      }
    })();
  }, [debouncedCustomerSearch]);

  const getCustomerBadge = (c: CustomerOption) => {
    if (c.kind === 'PERSON') return 'PF';
    if (c.kind === 'COMPANY') {
      if (c.isFilial) return 'Filial';
      if (c.isMatriz) return 'Matriz';
      return 'Empresa';
    }
    return '';
  };

  const handleFileSelect = (file: File | null) => {
    if (!file) return;

    // Validar tipo de arquivo (aceita áudio e vídeo)
    const validTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/mp4',
      'audio/m4a',
      'audio/webm',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo'
    ];

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['mp3', 'wav', 'mp4', 'm4a', 'webm', 'mov', 'avi', 'mkv', 'flac', 'ogg'];

    if (
      !validTypes.includes(file.type) &&
      !validExtensions.includes(fileExtension || '')
    ) {
      openSnackbar({
        open: true,
        message: 'Tipo de arquivo não suportado. Use arquivos de áudio ou vídeo.',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      openSnackbar({
        open: true,
        message: 'Selecione um arquivo para transcrever',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
      return;
    }

    try {
      setIsSubmitting(true);

      const params: TranscribeRequestParams = {};
      if (selectedCustomer?.id) params.customerId = selectedCustomer.id;

      const record = await transcribeFile(selectedFile, params);
      onSuccess(record);
      onClose();
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || err?.message || 'Falha ao fazer upload do arquivo',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                color: 'white',
                display: 'grid',
                placeItems: 'center'
              }}
            >
              <AudioOutlined />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Nova Transcrição
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Faça upload de arquivo de áudio ou vídeo
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={onClose} disabled={isSubmitting} size="small">
            <CloseOutlined />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* Upload Area */}
          <Box
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            sx={{
              border: '2px dashed',
              borderColor: dragActive ? 'primary.main' : 'divider',
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: dragActive ? 'action.hover' : 'transparent',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover'
              }
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*,.mp3,.wav,.mp4,.m4a,.webm,.mov,.avi,.mkv,.flac,.ogg"
              style={{ display: 'none' }}
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
            />

            {selectedFile ? (
              <Stack spacing={1} alignItems="center">
                <AudioOutlined style={{ fontSize: 48, color: 'var(--mui-palette-primary-main)' }} />
                <Typography variant="h6" fontWeight={600}>
                  {selectedFile.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatFileSize(selectedFile.size)}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  Trocar Arquivo
                </Button>
              </Stack>
            ) : (
              <Stack spacing={1} alignItems="center">
                <UploadOutlined style={{ fontSize: 48, color: 'var(--mui-palette-text-secondary)' }} />
                <Typography variant="h6">Arraste e solte o arquivo aqui</Typography>
                <Typography variant="body2" color="text.secondary">
                  ou clique para selecionar
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Formatos suportados: MP3, WAV, MP4, M4A, WEBM, MOV, AVI, MKV, FLAC, OGG
                </Typography>
              </Stack>
            )}
          </Box>

          {/* Seleção de Cliente */}
          <Autocomplete
            options={customerOptions}
            value={selectedCustomer}
            onChange={(_, newValue) => setSelectedCustomer(newValue)}
            onInputChange={(_, newInputValue) => setCustomerSearchTerm(newInputValue)}
            getOptionLabel={(option) => labelCustomer(option)}
            loading={loadingCustomers}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Cliente (opcional)"
                placeholder="Buscar cliente..."
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loadingCustomers ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  )
                }}
              />
            )}
            renderOption={(props, option) => {
              const badge = getCustomerBadge(option);
              return (
                <li {...props} key={option.id}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
                    <Typography sx={{ flex: 1 }}>{labelCustomer(option)}</Typography>
                    {badge && (
                      <Chip
                        size="small"
                        label={badge}
                        color={option.kind === 'PERSON' ? 'default' : option.isFilial ? 'secondary' : 'primary'}
                      />
                    )}
                  </Stack>
                </li>
              );
            }}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            noOptionsText="Nenhum cliente encontrado"
            clearOnEscape
            fullWidth
          />

        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!selectedFile || isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={16} /> : <UploadOutlined />}
        >
          {isSubmitting ? 'Processando...' : 'Transcrever'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

