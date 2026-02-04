import { Plugin, ButtonView } from 'ckeditor5';
import type { Editor } from 'ckeditor5';
import html2pdf from 'html2pdf.js';

export default class ExportToPdfPlugin extends Plugin {
  static get pluginName(): string {
    return 'ExportToPdf';
  }

  init(): void {
    const editor: Editor = this.editor;

    // Adiciona o comando de exportação
    editor.commands.add('exportToPdf', {
      execute: () => {
        this.exportToPdf();
      }
    } as any);

    // Adiciona o botão na UI
    editor.ui.componentFactory.add('exportToPdf', () => {
      const button = new ButtonView();
      
      button.set({
        label: 'Baixar PDF',
        icon: `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path d="M10.5 1.5v11m0 0l3.5-3.5m-3.5 3.5L6.5 9M2.5 15.5h15m-13 2h11" stroke="currentColor" stroke-width="1.5" fill="none"/>
        </svg>`,
        tooltip: true
      });

      // Executa o comando quando o botão for clicado
      button.on('execute', () => {
        editor.execute('exportToPdf');
      });

      return button;
    });
  }

  private exportToPdf(): void {
    const editor = this.editor;
    const data = editor.getData();

    // Cria um elemento temporário com o conteúdo
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = data;
    tempDiv.style.padding = '40px';
    tempDiv.style.fontFamily = 'Calibri, Arial, sans-serif';
    tempDiv.style.fontSize = '11pt';
    tempDiv.style.lineHeight = '1.5';
    tempDiv.style.color = '#000';
    tempDiv.style.backgroundColor = '#fff';

    // Configurações do PDF
    const opt = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename: `documento-${new Date().getTime()}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        logging: false
      },
      jsPDF: { 
        unit: 'mm' as const, 
        format: 'a4' as const, 
        orientation: 'portrait' as const
      },
      pagebreak: { 
        mode: ['avoid-all' as const, 'css' as const, 'legacy' as const] 
      }
    };

    // Gera e baixa o PDF
    html2pdf()
      .set(opt)
      .from(tempDiv)
      .save()
      .catch((error: Error) => {
        console.error('Erro ao gerar PDF:', error);
        alert('Erro ao gerar o PDF. Por favor, tente novamente.');
      });
  }
}
