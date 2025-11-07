import { useRef } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import UploadOutlined from '@ant-design/icons/UploadOutlined';
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import InfoCircleOutlined from '@ant-design/icons/InfoCircleOutlined';
import { openSnackbar } from 'api/snackbar';
import { useCaseWizard } from '../CaseWizardContext';

export default function StepAttachments() {
  const { instruction, setInstruction, files, setFiles } = useCaseWizard();
  const fileRef = useRef<HTMLInputElement>(null);

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = Array.from(e.target.files || []);
    e.target.value = '';
    if (!f.length) return;
    const valid = f.filter(file =>
      /(^application\/pdf$)|(^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$)|(^image\/(png|jpeg|jpg|webp|gif)$)/i.test(file.type)
    );
    if (valid.length !== f.length) {
      openSnackbar({ open: true, message: 'Alguns arquivos foram ignorados (somente PDF, DOCX e imagens).', variant: 'alert', alert: { color: 'warning' } } as any);
    }
    setFiles([...(files || []), ...valid]);
  };
  const removeFile = (idx: number) => setFiles(files.filter((_, i) => i !== idx));

  return (
    <Stack spacing={1.5}>
      <Typography fontWeight={700}>6. Instruções & Anexos</Typography>
      <TextField
        placeholder="Ex.: pontos específicos do cliente, observações, fatos relevantes…"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        multiline
        minRows={3}
      />
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography fontWeight={700}>Anexos (PDF/DOCX/Imagens)</Typography>
        <Button startIcon={<UploadOutlined />} variant="outlined" onClick={() => fileRef.current?.click()}>
          Adicionar arquivos
        </Button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp,image/gif"
          style={{ display: 'none' }}
          onChange={onPickFiles}
        />
      </Stack>
      {!files.length ? (
        <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
          Nenhum anexo adicionado.
        </Paper>
      ) : (
        <Stack spacing={1}>
          {files.map((f, idx) => {
            const isImg = /^image\//i.test(f.type);
            const isPdf = /^application\/pdf$/i.test(f.type);
            const isDocx = /^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$/i.test(f.type);
            const url = URL.createObjectURL(f);
            return (
              <Paper variant="outlined" sx={{ p: 1.5 }} key={idx}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <Box sx={{ width: 56, height: 56, borderRadius: 1, overflow: 'hidden', bgcolor: 'grey.100', display: 'grid', placeItems: 'center' }}>
                    {isImg ? (
                      <img src={url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Typography variant="caption">{isDocx ? 'DOCX' : 'PDF'}</Typography>
                    )}
                  </Box>
                  <Stack flex={1} minWidth={0}>
                    <Typography noWrap title={f.name}>{f.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{(f.size / 1024).toFixed(1)} KB</Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.5}>
                    <IconButton size="small" onClick={() => window.open(url, '_blank') as any} title="Visualizar">
                      <InfoCircleOutlined />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => removeFile(idx)} title="Remover">
                      <CloseOutlined />
                    </IconButton>
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
