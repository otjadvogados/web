import { useState, useRef, useEffect } from 'react';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import InfoCircleOutlined from '@ant-design/icons/InfoCircleOutlined';
import WarningOutlined from '@ant-design/icons/WarningOutlined';
import CheckCircleOutlined from '@ant-design/icons/CheckCircleOutlined';
import CloseCircleOutlined from '@ant-design/icons/CloseCircleOutlined';
import EyeOutlined from '@ant-design/icons/EyeOutlined';
import type { OcrTestResponse } from 'api/aiDocs';
import type { FileWithOcr } from './useReportFilesWithOcr';

function getOcrStatusIcon(ocrResult?: OcrTestResponse) {
  if (!ocrResult) return null;
  if (ocrResult.ocr === 'Sucesso') {
    return <CheckCircleOutlined style={{ color: '#4caf50', fontSize: 18 }} />;
  }
  if (ocrResult.ocr === 'Atenção') {
    return <WarningOutlined style={{ color: '#ff9800', fontSize: 18 }} />;
  }
  return <CloseCircleOutlined style={{ color: '#f44336', fontSize: 18 }} />;
}

interface ReportFileListWithOcrProps {
  filesWithOcr: FileWithOcr[];
  onRemove: (index: number) => void;
}

export default function ReportFileListWithOcr({ filesWithOcr, onRemove }: ReportFileListWithOcrProps) {
  const [ocrMessageDialog, setOcrMessageDialog] = useState<{ open: boolean; message: string; fileName: string }>({
    open: false,
    message: '',
    fileName: ''
  });
  const urlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      urlsRef.current = [];
    };
  }, []);

  if (filesWithOcr.length === 0) return null;

  urlsRef.current = [];
  return (
    <>
      <Stack spacing={1} sx={{ mt: 2 }}>
        {filesWithOcr.map((entry, index) => {
          const f = entry.file;
          const isImg = /^image\//i.test(f.type);
          const isPdf = /^application\/pdf$/i.test(f.type);
          const isDocx = /^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$/i.test(f.type);
          const url = URL.createObjectURL(f);
          urlsRef.current.push(url);
          const isLoading = entry.verifying;
          const ocrStatusIcon = getOcrStatusIcon(entry.ocrResult);
          return (
            <Paper variant="outlined" sx={{ p: 1 }} key={entry.id}>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1,
                    overflow: 'hidden',
                    bgcolor: 'grey.100',
                    display: 'grid',
                    placeItems: 'center'
                  }}
                >
                  {isImg ? (
                    <img src={url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Typography variant="caption">{isDocx ? 'DOCX' : isPdf ? 'PDF' : 'ARQ'}</Typography>
                  )}
                </Box>
                <Stack flex={1} minWidth={0}>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Typography noWrap title={f.name}>
                      {f.name}
                    </Typography>
                    {isLoading && <CircularProgress size={12} />}
                    {ocrStatusIcon && !isLoading && ocrStatusIcon}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {(f.size / 1024).toFixed(1)} KB
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={0.5}>
                  {entry.ocrResult && (
                    <Tooltip title="Ver mensagem do OCR">
                      <IconButton
                        size="small"
                        onClick={() => setOcrMessageDialog({ open: true, message: entry.ocrResult!.message, fileName: f.name })}
                      >
                        <InfoCircleOutlined />
                      </IconButton>
                    </Tooltip>
                  )}
                  <IconButton size="small" onClick={() => window.open(url, '_blank')} title="Visualizar arquivo">
                    <EyeOutlined />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => onRemove(index)} title="Remover">
                    <CloseOutlined />
                  </IconButton>
                </Stack>
              </Stack>
            </Paper>
          );
        })}
      </Stack>

      {/* Dialog para exibir mensagem completa do OCR (igual em Casos) */}
      <Dialog
        open={ocrMessageDialog.open}
        onClose={() => setOcrMessageDialog({ open: false, message: '', fileName: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Mensagem do OCR - {ocrMessageDialog.fileName}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {ocrMessageDialog.message}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOcrMessageDialog({ open: false, message: '', fileName: '' })}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
