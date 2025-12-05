import { useRef, useEffect } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';

type Props = {
  html: string;
  onChange: (html: string) => void;
  editable?: boolean;
};

export default function HtmlEditor({ html, onChange, editable = true }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    if (editorRef.current && !isUpdatingRef.current) {
      editorRef.current.innerHTML = html;
    }
  }, [html]);

  const handleInput = () => {
    if (editorRef.current && editable) {
      isUpdatingRef.current = true;
      onChange(editorRef.current.innerHTML);
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    }
  };

  return (
    <Box 
      sx={{ 
        height: '100%', 
        overflow: 'auto',
        bgcolor: 'grey.50',
        p: 3
      }}
    >
      <Paper
        elevation={2}
        sx={{
          minHeight: '100%',
          maxWidth: '210mm', // Largura A4
          mx: 'auto',
          p: 4,
          bgcolor: 'white'
        }}
      >
        <Box
          ref={editorRef}
          contentEditable={editable}
          onInput={handleInput}
          suppressContentEditableWarning
          sx={{
            minHeight: '297mm', // Altura A4
            outline: 'none',
            fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            fontSize: '14px',
            lineHeight: 1.6,
            color: 'text.primary',
            '& h1': {
              fontSize: '24px',
              fontWeight: 700,
              margin: '1em 0 0.5em',
              textAlign: 'center'
            },
            '& h2': {
              fontSize: '20px',
              fontWeight: 600,
              margin: '1em 0 0.5em'
            },
            '& h3': {
              fontSize: '16px',
              fontWeight: 600,
              margin: '1em 0 0.5em'
            },
            '& p': {
              margin: '0.75em 0',
              textAlign: 'justify'
            },
            '& ul, & ol': {
              paddingLeft: '1.5em',
              margin: '0.75em 0'
            },
            '& li': {
              margin: '0.25em 0'
            },
            '& strong': {
              fontWeight: 600
            },
            '& em': {
              fontStyle: 'italic'
            }
          }}
        />
      </Paper>
    </Box>
  );
}
