import { render } from '../../test-utils';
import { MegaSearch } from '../MegaSearch';

describe('MegaSearch Component', () => {
  it('renders without crashing', () => {
    render(<MegaSearch />);
    expect(document.body).toBeInTheDocument();
  });
});