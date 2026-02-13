import { render } from '../../test-utils';
import { Gamification } from '../Gamification';

describe('Gamification Component', () => {
  it('renders without crashing', () => {
    render(<Gamification />);
    expect(document.body).toBeInTheDocument();
  });
});