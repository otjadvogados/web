import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ArrowLeftOutlined from '@ant-design/icons/ArrowLeftOutlined';
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';
import FileTextOutlined from '@ant-design/icons/FileTextOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import MainCard from 'components/MainCard';
import { openSnackbar } from 'api/snackbar';
import { listPromptFolders, deletePrompt, type PromptFolder, type Prompt } from 'api/prompts';
import Permission from 'components/Permission';
import ConfirmDeleteDialog from 'components/ConfirmDeleteDialog';
import PromptFormDialog from 'sections/ai/prompts/PromptFormDialog';

export default function PromptsFolderPage() {
  const navigate = useNavigate();
  const { folderId } = useParams<{ folderId: string }>();
  const [folder, setFolder] = useState<PromptFolder | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [promptToDelete, setPromptToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Dialog de formulário
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editInitial, setEditInitial] = useState<Prompt | null>(null);

  const loadFolder = async () => {
    if (!folderId) return;
    
    try {
      setLoading(true);
      
      // Busca a pasta na lista de pastas de prompts
      const folders = await listPromptFolders();
      // Busca por id ou por id === 'general' se o folderId for 'general'
      const foundFolder = folders.find((f) => 
        f.id === folderId || 
        (folderId === 'general' && (f.id === 'general' || f.type === 'general'))
      );
      
      if (!foundFolder) {
        openSnackbar({
          open: true,
          message: 'Pasta não encontrada',
          variant: 'alert',
          alert: { color: 'error' }
        } as any);
        navigate('/ai/prompts');
        return;
      }

      // Para pasta geral, garante que o tipo está correto
      const folderToSet = folderId === 'general' && foundFolder.type !== 'general'
        ? { ...foundFolder, type: 'general' as const, customerId: null, departmentId: null }
        : foundFolder;

      setFolder(folderToSet);
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao carregar prompts',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
      navigate('/ai/prompts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFolder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId]);

  const applySearchFilter = (prompts: Prompt[], q: string) => {
    const term = q.trim().toLowerCase();
    if (!term) return prompts;
    return prompts.filter((prompt) => 
      (prompt.name || '').toLowerCase().includes(term) ||
      (prompt.description || '').toLowerCase().includes(term)
    );
  };

  const filteredPrompts = useMemo(() => {
    if (!folder || !folder.items) return [];
    
    // Para pasta geral, filtra apenas prompts com customerId e departmentId null
    let promptsToShow = folder.items;
    const isGeneralFolder = folder.type === 'general' || (folder.customerId === null && folder.departmentId === null) || folder.id === 'general';
    
    if (isGeneralFolder) {
      // Mostra apenas prompts que não têm customerId nem departmentId (null)
      promptsToShow = folder.items.filter(prompt => 
        (prompt.customerId === null || prompt.customerId === undefined) &&
        (prompt.departmentId === null || prompt.departmentId === undefined)
      );
    } else {
      // Para pasta de cliente/departamento, mostra todos os prompts dessa pasta
      promptsToShow = folder.items;
    }
    
    return applySearchFilter(promptsToShow, search);
  }, [folder, search]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDeleteClick = (prompt: Prompt) => {
    setPromptToDelete({ id: prompt.id, name: prompt.name });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!promptToDelete) return;

    try {
      setDeleting(true);
      await deletePrompt(promptToDelete.id);
      
      openSnackbar({
        open: true,
        message: 'Prompt removido com sucesso!',
        variant: 'alert',
        alert: { color: 'success' }
      } as any);

      setDeleteDialogOpen(false);
      setPromptToDelete(null);

      // Recarrega a pasta para atualizar a lista
      try {
        const folders = await listPromptFolders();
        const foundFolder = folders.find((f) => f.id === folderId);
        
        if (foundFolder) {
          setFolder(foundFolder);
        } else {
          // Se a pasta não foi encontrada, volta para lista
          navigate('/ai/prompts');
        }
      } catch (err: any) {
        // Em caso de erro ao recarregar, apenas loga o erro
        console.error('Erro ao recarregar pasta após exclusão:', err);
      }
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao remover prompt',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setDeleting(false);
    }
  };

  const handleEditClick = (prompt: Prompt) => {
    setEditId(prompt.id);
    setEditInitial(prompt);
    setFormOpen(true);
  };

  const handleCreateClick = () => {
    // Pré-preenche customerId e departmentId baseado na pasta
    const initialPrompt: Partial<Prompt> = {
      customerId: folder?.customerId ?? null,
      departmentId: folder?.departmentId ?? null
    };
    setEditId(null);
    setEditInitial(initialPrompt as Prompt);
    setFormOpen(true);
  };

  const handleFormSaved = () => {
    loadFolder();
  };

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <MainCard
          title={
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                size="small"
                startIcon={<ArrowLeftOutlined />}
                onClick={() => navigate('/ai/prompts')}
                sx={{ mr: 1 }}
              >
                Voltar
              </Button>
              <FileTextOutlined />
              <Typography variant="h6" fontWeight={700}>
                {folder?.name || 'Carregando...'}
              </Typography>
            </Stack>
          }
          contentSX={{ p: 0 }}
        >
          <Stack spacing={1.5} sx={{ p: 2 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : !folder ? (
              <Stack alignItems="center" sx={{ py: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Pasta não encontrada.
                </Typography>
              </Stack>
            ) : folder.items.length === 0 ? (
              <Stack alignItems="center" sx={{ py: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Nenhum prompt nesta pasta.
                </Typography>
              </Stack>
            ) : (
              <>
                {/* Busca */}
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.25}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                  justifyContent="space-between"
                >
                  <TextField
                    label="Buscar prompts"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nome..."
                    sx={{ flex: 1 }}
                    size="small"
                  />
                  <Stack direction="row" spacing={1}>
                    <Permission resources={['ai.prompts.create']}>
                      <Button
                        variant="contained"
                        startIcon={<PlusOutlined />}
                        onClick={handleCreateClick}
                      >
                        Novo Prompt
                      </Button>
                    </Permission>
                    <Permission resources={['ai.prompts.read']}>
                      <Button variant="outlined" startIcon={<ReloadOutlined />} onClick={loadFolder} disabled={loading}>
                        Atualizar
                      </Button>
                    </Permission>
                  </Stack>
                </Stack>

                <Divider />

                {/* Lista de Prompts */}
                <Permission resources={['ai.prompts.read']}>
                  {filteredPrompts.length === 0 ? (
                    <Stack alignItems="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        {search ? 'Nenhum resultado encontrado.' : 'Nenhum prompt encontrado nesta pasta.'}
                      </Typography>
                    </Stack>
                  ) : (
                    <>
                      {/* Header estilo Explorer */}
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 0.5, mt: 0.5 }}>
                        <Typography variant="subtitle1" fontWeight={800}>
                          {folder.name || 'Prompts'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {filteredPrompts.length} {filteredPrompts.length === 1 ? 'prompt' : 'prompts'}
                        </Typography>
                      </Stack>

                      <Box
                        sx={{
                          minHeight: '60vh',
                          p: 2,
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(auto-fill, minmax(300px, 1fr))',
                            md: 'repeat(auto-fill, minmax(320px, 1fr))',
                            lg: 'repeat(auto-fill, minmax(340px, 1fr))'
                          },
                          gap: 1.5,
                          alignContent: 'start',
                          justifyItems: 'stretch'
                        }}
                      >
                        {filteredPrompts.map((prompt) => (
                          <Box
                            key={prompt.id}
                            sx={{
                              p: 2,
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1.5,
                              bgcolor: 'background.paper',
                              transition: 'all 0.2s',
                              '&:hover': {
                                boxShadow: 2,
                                borderColor: 'primary.main'
                              }
                            }}
                          >
                            <Stack spacing={1.5}>
                              {/* Cabeçalho do Prompt */}
                              <Stack spacing={0.5}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <FileTextOutlined style={{ fontSize: 20, color: folder.customerId ? '#4CAF50' : '#2196F3' }} />
                                  <Typography fontWeight={600} noWrap sx={{ flex: 1, minWidth: 0 }}>
                                    {prompt.name}
                                  </Typography>
                                </Stack>
                                {prompt.description && (
                                  <Typography variant="caption" color="text.secondary" sx={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: 'vertical'
                                  }}>
                                    {prompt.description}
                                  </Typography>
                                )}
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={0.5}>
                                  <Typography variant="caption" color="text.secondary">
                                    {formatDate(prompt.createdAt)}
                                  </Typography>
                                  {(prompt.customer || prompt.department) && (
                                    <>
                                      <Typography variant="caption" color="text.secondary">•</Typography>
                                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                        {prompt.customer && (
                                          <Chip
                                            label={prompt.customer.displayName}
                                            size="small"
                                            variant="outlined"
                                          />
                                        )}
                                        {prompt.department && (
                                          <Chip
                                            label={prompt.department.name}
                                            size="small"
                                            variant="outlined"
                                          />
                                        )}
                                      </Stack>
                                    </>
                                  )}
                                </Stack>
                              </Stack>

                              <Divider />

                              {/* Ações */}
                              <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap">
                                <Permission resources={['ai.prompts.update']}>
                                  <Tooltip title="Editar">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleEditClick(prompt)}
                                    >
                                      <EditOutlined />
                                    </IconButton>
                                  </Tooltip>
                                </Permission>
                                <Permission resources={['ai.prompts.delete']}>
                                  <Tooltip title="Excluir">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleDeleteClick(prompt)}
                                    >
                                      <DeleteOutlined />
                                    </IconButton>
                                  </Tooltip>
                                </Permission>
                              </Stack>
                            </Stack>
                          </Box>
                        ))}
                      </Box>
                    </>
                  )}
                </Permission>
              </>
            )}
          </Stack>
        </MainCard>
      </Grid>

      {/* Dialog de confirmação de exclusão */}
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setPromptToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        itemName={promptToDelete?.name || ''}
        loading={deleting}
      />

      {/* Dialog de formulário */}
      <PromptFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditId(null);
          setEditInitial(null);
        }}
        editingId={editId}
        initial={editInitial || undefined}
        onSaved={handleFormSaved}
      />
    </Grid>
  );
}
