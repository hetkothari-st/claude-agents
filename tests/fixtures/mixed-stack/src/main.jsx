import { createRoot } from 'react-dom/client';
import styled from 'styled-components';

const Title = styled.h1`color: tomato;`;
createRoot(document.getElementById('root')).render(<Title>Mixed</Title>);
