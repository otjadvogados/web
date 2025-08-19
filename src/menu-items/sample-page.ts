// This is example of menu item without group for horizontal layout. There will be no children.

// assets
import ChromeOutlined from '@ant-design/icons/ChromeOutlined';

// type
import { NavItemType } from 'types/menu';

// icons
const icons = { ChromeOutlined };

// ==============================|| MENU ITEMS - SAMPLE PAGE ||============================== //

const samplePage: NavItemType = {
  id: 'sample-page',
  title: 'sample-page',
  type: 'group',
  url: '/sample-page',
  icon: icons.ChromeOutlined
};

export default samplePage;
