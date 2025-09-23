import { SvgIcon, SvgIconProps } from '@mui/material';

export default function UncheckedIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24">
        <path fill="currentColor" d="M3 3h18v18H3zm16 16V5H5v14z"></path>
      </svg>
    </SvgIcon>
  );
}
