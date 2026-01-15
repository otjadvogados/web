import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import { useTheme, alpha } from '@mui/material/styles';
import FolderFilled from '@ant-design/icons/FolderFilled';
import FolderOpenFilled from '@ant-design/icons/FolderOpenFilled';
import { TranscriptionFolder } from 'api/aiTranscribe';
import { useState } from 'react';

interface FolderTileProps {
  folder: TranscriptionFolder;
  onClick: (folderId: string) => void;
  selected?: boolean;
}

export default function FolderTile({ folder, onClick, selected = false }: FolderTileProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [hovered, setHovered] = useState(false);

  const itemCount = Array.isArray(folder.items) ? folder.items.length : 0;
  const displayName = folder.name || 'Sem nome';
  const shouldTruncate = displayName.length > 28;

  // Amarelo “Windows folder”
  const folderColor = selected ? theme.palette.primary.main : (isDark ? '#FFC94A' : '#F4B400');

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label={`Pasta ${displayName}${itemCount > 0 ? ` com ${itemCount} itens` : ''}`}
      onClick={() => onClick(folder.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(folder.id);
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: 320,
        height: 100,
        px: 2,
        py: 1.5,
        borderRadius: 1.5, // ~12px
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        cursor: 'pointer',
        userSelect: 'none',
        outline: 'none',

        backgroundColor: 'transparent',
        border: 'none',

        transition: 'transform .08s ease',
        '&:active': { transform: 'scale(0.985)' },
        '&:focus-visible': {
          outline: `2px solid ${alpha(theme.palette.primary.main, 0.9)}`,
          outlineOffset: 2
        }
      }}
    >
      {/* Ícone + badge */}
      <Box sx={{ position: 'relative', width: 56, height: 56, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        {itemCount > 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: -6,
              right: -6,
              minWidth: 22,
              height: 22,
              px: 0.875,
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              boxShadow: `0 2px 6px ${alpha(theme.palette.common.black, 0.25)}`
            }}
          >
            {itemCount > 99 ? '99+' : itemCount}
          </Box>
        )}

        {/* Ant Design icon (filled) */}
        {hovered ? (
          <FolderOpenFilled style={{ fontSize: 44, color: folderColor }} />
        ) : (
          <FolderFilled style={{ fontSize: 44, color: folderColor }} />
        )}
      </Box>

      {/* Nome + tipo */}
      <Box sx={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        {shouldTruncate ? (
          <Tooltip title={displayName} arrow placement="top">
            <Typography
              sx={{
                fontSize: 15,
                lineHeight: 1.4,
                fontWeight: 500,
                color: theme.palette.text.primary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {displayName}
            </Typography>
          </Tooltip>
        ) : (
          <Typography
            sx={{
              fontSize: 15,
              lineHeight: 1.4,
              fontWeight: 500,
              color: theme.palette.text.primary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {displayName}
          </Typography>
        )}

        {folder.type === 'customer' && (
          <Chip
            label="Cliente"
            size="small"
            variant="outlined"
            sx={{
              alignSelf: 'flex-start',
              height: 18,
              fontSize: 10,
              borderColor: alpha(theme.palette.text.secondary, isDark ? 0.22 : 0.28),
              color: alpha(theme.palette.text.secondary, isDark ? 0.75 : 0.9),
              backgroundColor: 'transparent',
              '& .MuiChip-label': { px: 0.7 }
            }}
          />
        )}
      </Box>
    </Box>
  );
}
