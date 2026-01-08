import { useState, useEffect, useMemo } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import RightOutlined from '@ant-design/icons/RightOutlined';
import CheckCircleOutlined from '@ant-design/icons/CheckCircleOutlined';
import { useTheme } from '@mui/material/styles';

export type ChecklistItem = {
  id: string;
  label: string;
  required?: boolean;
  checked: boolean;
  description?: string;
  subItems?: ChecklistItem[];
};

export type ChecklistSection = {
  id: string;
  title: string;
  items: ChecklistItem[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
  description?: string;
};

type Props = {
  open: boolean;
  title: string;
  sections: ChecklistSection[];
  confirmText?: string;
  cancelText?: string;
  allowSkip?: boolean;
  onConfirm: (checkedItems: Record<string, boolean>) => void;
  onCancel: () => void;
  onSkip?: () => void;
};

/**
 * Dialog de checklist para criação de casos.
 * Permite marcar/desmarcar itens e valida itens obrigatórios.
 */
export default function CaseChecklistDialog({
  open,
  title,
  sections,
  confirmText = 'Continuar',
  cancelText = 'Cancelar',
  allowSkip = false,
  onConfirm,
  onCancel,
  onSkip
}: Props) {
  const theme = useTheme();
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // Inicializa os itens marcados quando o dialog abre
  useEffect(() => {
    if (open) {
      const initial: Record<string, boolean> = {};
      sections.forEach((section) => {
        section.items.forEach((item) => {
          initial[item.id] = item.checked || false;
          // Inicializa subitens também
          item.subItems?.forEach((subItem) => {
            initial[subItem.id] = subItem.checked || false;
          });
        });
      });
      setCheckedItems(initial);
    }
  }, [open, sections]);

  const handleToggle = (itemId: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Valida se todos os itens obrigatórios estão marcados
  const isValid = useMemo(() => {
    for (const section of sections) {
      for (const item of section.items) {
        if (item.required && !checkedItems[item.id]) {
          return false;
        }
        // Verifica subitens obrigatórios
        if (item.subItems) {
          for (const subItem of item.subItems) {
            if (subItem.required && !checkedItems[subItem.id]) {
              return false;
            }
          }
        }
      }
    }
    return true;
  }, [sections, checkedItems]);

  const handleConfirm = () => {
    if (isValid) {
      onConfirm(checkedItems);
    }
  };

  const requiredCount = useMemo(() => {
    let count = 0;
    sections.forEach((section) => {
      section.items.forEach((item) => {
        if (item.required) count++;
        if (item.subItems) {
          item.subItems.forEach((subItem) => {
            if (subItem.required) count++;
          });
        }
      });
    });
    return count;
  }, [sections]);

  const checkedRequiredCount = useMemo(() => {
    let count = 0;
    sections.forEach((section) => {
      section.items.forEach((item) => {
        if (item.required && checkedItems[item.id]) count++;
        if (item.subItems) {
          item.subItems.forEach((subItem) => {
            if (subItem.required && checkedItems[subItem.id]) count++;
          });
        }
      });
    });
    return count;
  }, [sections, checkedItems]);

  return (
    <Dialog 
      open={open} 
      onClose={onCancel} 
      fullWidth 
      maxWidth="md"
      PaperProps={{
        sx: { maxHeight: '90vh' }
      }}
    >
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <CheckCircleOutlined style={{ color: theme.palette.primary.main }} />
          <Typography variant="h6">{title}</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {requiredCount > 0 && (
            <Alert severity={isValid ? 'success' : 'warning'}>
              {checkedRequiredCount} de {requiredCount} itens obrigatórios marcados
            </Alert>
          )}

          {sections.map((section) => (
            <Accordion
              key={section.id}
              defaultExpanded={section.defaultExpanded !== false}
              disabled={section.collapsible === false}
            >
              <AccordionSummary expandIcon={section.collapsible !== false ? <RightOutlined /> : null}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%', mr: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {section.title}
                  </Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={1.5}>
                  {section.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {section.description}
                    </Typography>
                  )}
                  {section.items.map((item) => (
                    <Box key={item.id}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={checkedItems[item.id] || false}
                            onChange={() => handleToggle(item.id)}
                            color="primary"
                          />
                        }
                        label={
                          <Stack>
                            <Typography variant="body2" fontWeight={item.required ? 600 : 400}>
                              {item.label}
                              {item.required && (
                                <Typography component="span" color="error.main" sx={{ ml: 0.5 }}>
                                  *
                                </Typography>
                              )}
                            </Typography>
                            {item.description && (
                              <Typography variant="caption" color="text.secondary">
                                {item.description}
                              </Typography>
                            )}
                          </Stack>
                        }
                      />
                      {item.subItems && item.subItems.length > 0 && (
                        <Box sx={{ pl: 4, mt: 0.5 }}>
                          <Stack spacing={0.5}>
                            {item.subItems.map((subItem) => (
                              <FormControlLabel
                                key={subItem.id}
                                control={
                                  <Checkbox
                                    checked={checkedItems[subItem.id] || false}
                                    onChange={() => handleToggle(subItem.id)}
                                    color="primary"
                                    size="small"
                                  />
                                }
                                label={
                                  <Stack>
                                    <Typography variant="body2" fontSize="0.875rem" fontWeight={subItem.required ? 600 : 400}>
                                      {subItem.label}
                                      {subItem.required && (
                                        <Typography component="span" color="error.main" sx={{ ml: 0.5 }}>
                                          *
                                        </Typography>
                                      )}
                                    </Typography>
                                    {subItem.description && (
                                      <Typography variant="caption" color="text.secondary" fontSize="0.75rem">
                                        {subItem.description}
                                      </Typography>
                                    )}
                                  </Stack>
                                }
                              />
                            ))}
                          </Stack>
                        </Box>
                      )}
                    </Box>
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Stack direction="row" spacing={1} sx={{ width: '100%', justifyContent: 'space-between' }}>
          <Button onClick={onCancel} color="secondary">
            {cancelText}
          </Button>
          <Stack direction="row" spacing={1}>
            {allowSkip && onSkip && (
              <Button onClick={onSkip} variant="outlined" color="secondary">
                Pular
              </Button>
            )}
            <Button
              onClick={handleConfirm}
              variant="contained"
              disabled={!isValid}
            >
              {confirmText}
            </Button>
          </Stack>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}

