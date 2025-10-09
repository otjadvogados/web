// ==============================|| OVERRIDES - AUTOCOMPLETE ||============================== //

export default function Autocomplete(theme: any) {
  const glass = {
    backdropFilter: 'blur(10px) saturate(120%)',
    WebkitBackdropFilter: 'blur(10px) saturate(120%)',
    border: '1px solid rgba(255,255,255,.08)'
  };
  
  return {
    MuiAutocomplete: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            padding: '3px 9px'
          }
        },
        popupIndicator: {
          width: 'auto',
          height: 'auto'
        },
        clearIndicator: {
          width: 'auto',
          height: 'auto'
        },
        paper: {
          backgroundImage: `${theme.customGradients.paperBg} !important`,
          backgroundColor: 'transparent !important',
          borderRadius: theme.shape.borderRadius,
          ...glass
        },
        option: {
          '&[aria-selected="true"]': {
            backgroundColor: theme.palette.action.selected
          },
          '&.Mui-focused': {
            backgroundColor: theme.palette.action.hover
          }
        }
      }
    },
    MuiSelect: {
      styleOverrides: {
        paper: {
          backgroundImage: `${theme.customGradients.paperBg} !important`,
          backgroundColor: 'transparent !important',
          borderRadius: theme.shape.borderRadius,
          ...glass
        }
      }
    }
  };
}
