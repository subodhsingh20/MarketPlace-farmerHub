jest.mock(
  "react-router-dom",
  () => ({
    BrowserRouter: ({ children }) => children,
    Navigate: () => null,
    Route: ({ element }) => element,
    Routes: ({ children }) => children,
    NavLink: ({ children, to, ...rest }) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
    Link: ({ children, to, ...rest }) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
    useNavigate: () => jest.fn(),
    useLocation: () => ({ search: "", hash: "", pathname: "/" }),
  }),
  { virtual: true }
);

jest.mock(
  "axios",
  () => ({
    create: () => ({
      defaults: {
        headers: {
          common: {},
        },
      },
    }),
  }),
  { virtual: true }
);

jest.mock(
  "socket.io-client",
  () => ({
    io: () => ({
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    }),
  }),
  { virtual: true }
);

import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders navbar brand", () => {
  render(<App />);
  expect(screen.getByText(/farmer marketplace/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /login/i })).toBeInTheDocument();
});
