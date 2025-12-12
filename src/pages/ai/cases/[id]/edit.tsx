import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Toolbar from '@mui/material/Toolbar';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import SaveOutlined from '@ant-design/icons/SaveOutlined';
import ArrowLeftOutlined from '@ant-design/icons/ArrowLeftOutlined';
import DownloadOutlined from '@ant-design/icons/DownloadOutlined';
import HtmlEditor from 'sections/ai/edit-case/HtmlEditor';
import { getCaseResult, updateCaseResultHtml, CaseResult } from 'api/aiCases';
import { openSnackbar } from 'api/snackbar';
import { convertHtmlToDocx } from 'api/aiDocs';

export default function EditCasePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [caseData, setCaseData] = useState<CaseResult | null>(null);
  const [html, setHtml] = useState('');

  useEffect(() => {
    if (!id) {
      navigate('/ai/cases');
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const data = await getCaseResult(id);
        setCaseData(data);
        
        // Prioriza htmlMain (campo salvo pelo backend no AiCaseResult)
        // Depois tenta outros fallbacks para compatibilidade
        const htmlContent = 
          data?.htmlMain || 
          data?.html || 
          (data?._infos as any)?.phase06?.html || 
          data?.infos?.phase06?.html || 
          '';
        
        setHtml(htmlContent);
      } catch (err: any) {
        openSnackbar({
          open: true,
          message: err?.response?.data?.message || 'Falha ao carregar caso',
          variant: 'alert',
          alert: { color: 'error' }
        } as any);
        navigate('/ai/cases');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  const handleSave = async () => {
    if (!id) return;

    try {
      setSaving(true);
      await updateCaseResultHtml(id, {
        html,
        tags: caseData?.tags || {},
        replaceTags: false
      });

      openSnackbar({
        open: true,
        message: 'Caso salvo com sucesso!',
        variant: 'alert',
        alert: { color: 'success' }
      } as any);
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao salvar caso',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate('/ai/cases');
  };

  const handleDownloadDocx = async () => {
    if (!html || downloading) return;

    try {
      setDownloading(true);
      const { blob, filename } = await convertHtmlToDocx({
        html,
        filename: caseData?.piece?.name 
          ? `${caseData.piece.name.replace(/[\\/:*?"<>|]/g, '_')}.docx`
          : 'documento.docx'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'documento.docx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      openSnackbar({
        open: true,
        message: 'Documento DOCX baixado com sucesso!',
        variant: 'alert',
        alert: { color: 'success' }
      } as any);
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || err?.message || 'Falha ao converter para DOCX',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Barra de ferramentas superior */}
      <Paper elevation={2} sx={{ zIndex: 1100 }}>
        <Toolbar sx={{ gap: 2, justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <IconButton onClick={handleBack}>
              <ArrowLeftOutlined />
            </IconButton>
            <Box>
              <Typography variant="h6" fontWeight={600}>
                Editar Caso
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {caseData?.piece?.name || 'Documento'}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<DownloadOutlined />}
              onClick={handleDownloadDocx}
              disabled={downloading || !html}
            >
              {downloading ? 'Convertendo...' : 'Baixar DOCX'}
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveOutlined />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </Stack>
        </Toolbar>
      </Paper>

      {/* Área de edição */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <HtmlEditor
          html={html}
          onChange={setHtml}
          editable={true}
        />
      </Box>
    </Box>
  );
}
