import { useMemo } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import UploadOutlined from '@ant-design/icons/UploadOutlined';
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import InfoCircleOutlined from '@ant-design/icons/InfoCircleOutlined';
import WarningOutlined from '@ant-design/icons/WarningOutlined';
import { openSnackbar } from 'api/snackbar';
import { useCaseWizard } from '../CaseWizardContext';

export default function StepAttachments() {
  const { instruction, setInstruction, specs, attachments, addAttachments, removeAttachment, validateAttachments } = useCaseWizard();

  const isValidType = (file: File) =>
    /(^application\/pdf$)|(^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$)|(^image\/(png|jpeg|jpg|webp|gif)$)/i.test(file.type);

  const handlePick = (topicSpecificId: string, box: 'claimant' | 'client') =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = Array.from(e.target.files || []);
      e.target.value = '';
      if (!f.length) return;
      const valid = f.filter(isValidType);
      if (valid.length !== f.length) {
        openSnackbar({
          open: true,
          message: 'Alguns arquivos foram ignorados (somente PDF, DOCX e imagens).',
          variant: 'alert',
          alert: { color: 'warning' }
        } as any);
      }
      addAttachments(topicSpecificId, box, valid);
    };

  const bySpec = useMemo(() => {
    const map: Record<string, { claimant: any[]; client: any[] }> = {};
    for (const s of specs) map[s.id] = { claimant: [], client: [] };
    for (const a of attachments) {
      if (!map[a.topicSpecificId]) continue;
      map[a.topicSpecificId][a.box].push(a);
    }
    return map;
  }, [specs.map(s => s.id).join('|'), attachments.map(a => a.id).join('|')]);

  const validation = useMemo(() => validateAttachments(), [specs.map(s => s.id).join('|'), attachments.map(a => a.id).join('|'), validateAttachments]);

  return (
    <Stack spacing={1.5}>
      <Typography fontWeight={700}>6. Instruções & Anexos</Typography>
      
      {specs.length > 0 && !validation.valid && (
        <Alert 
          severity="warning" 
          icon={<WarningOutlined />}
          sx={{ mb: 1 }}
        >
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
            Atenção: Cada tópico específico deve ter pelo menos 1 anexo (em qualquer caixa).
          </Typography>
          <Typography variant="body2">
            Faltam anexos em: <strong>{validation.missingSpecs.join(', ')}</strong>
          </Typography>
        </Alert>
      )}
      <TextField
        placeholder="Ex.: pontos específicos do cliente, observações, fatos relevantes…"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        multiline
        minRows={3}
      />

      {!specs.length ? (
        <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
          Selecione ao menos 1 tópico específico para organizar anexos por caixa.
        </Paper>
      ) : (
        <Stack spacing={2}>
          {specs.map((spec) => {
            const group = bySpec[spec.id] || { claimant: [], client: [] };

            const renderBox = (boxKey: 'claimant' | 'client', title: string) => {
              const items = group[boxKey] || [];
              const inputId = `att-${spec.id}-${boxKey}`;
              return (
                <Paper variant="outlined" sx={{ p: 1.25, flex: 1, minWidth: 280 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                    <Typography fontWeight={700} variant="body2">{title}</Typography>
                    <Button
                      size="small"
                      startIcon={<UploadOutlined />}
                      variant="outlined"
                      onClick={() => document.getElementById(inputId)?.click()}
                    >
                      Adicionar
                    </Button>
                    <input
                      id={inputId}
                      type="file"
                      multiple
                      accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp,image/gif"
                      style={{ display: 'none' }}
                      onChange={handlePick(spec.id, boxKey)}
                    />
                  </Stack>

                  {!items.length ? (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      Nenhum anexo nesta caixa.
                    </Typography>
                  ) : (
                    <Stack spacing={1} sx={{ mt: 1 }}>
                      {items.map((a: any) => {
                        const f = a.file as File;
                        const isImg = /^image\//i.test(f.type);
                        const isPdf = /^application\/pdf$/i.test(f.type);
                        const isDocx = /^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$/i.test(f.type);
                        const url = URL.createObjectURL(f);
                        return (
                          <Paper variant="outlined" sx={{ p: 1 }} key={a.id}>
                            <Stack direction="row" spacing={1.25} alignItems="center">
                              <Box sx={{ width: 48, height: 48, borderRadius: 1, overflow: 'hidden', bgcolor: 'grey.100', display: 'grid', placeItems: 'center' }}>
                                {isImg ? (
                                  <img src={url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <Typography variant="caption">{isDocx ? 'DOCX' : (isPdf ? 'PDF' : 'ARQ')}</Typography>
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
                                <IconButton size="small" color="error" onClick={() => removeAttachment(a.id)} title="Remover">
                                  <CloseOutlined />
                                </IconButton>
                              </Stack>
                            </Stack>
                          </Paper>
                        );
                      })}
                    </Stack>
                  )}
                </Paper>
              );
            };

            const hasAttachments = (group.claimant?.length || 0) + (group.client?.length || 0) > 0;
            const specMissing = validation.missingSpecs.includes(spec.name);

            return (
              <Paper 
                key={spec.id} 
                variant="outlined" 
                sx={{ 
                  p: 1.5,
                  ...(specMissing ? {
                    borderColor: 'warning.main',
                    borderWidth: 2,
                    borderStyle: 'solid'
                  } : {})
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <Typography fontWeight={700}>
                    {spec.name}
                  </Typography>
                  {!hasAttachments && (
                    <Typography variant="caption" color="warning.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <WarningOutlined style={{ fontSize: 14 }} />
                      Sem anexos
                    </Typography>
                  )}
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                  {renderBox('claimant', 'Documentos do reclamante')}
                  {renderBox('client', 'Documentos da Reclamada')}
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
