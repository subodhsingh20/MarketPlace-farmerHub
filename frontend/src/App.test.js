jest.mock(
  "react-router-dom",
  () => {
    const React = require("react");

    const resolveClassName = (className, to) =>
      typeof className === "function" ? className({ isActive: to === "/" }) : className;

    return {
      BrowserRouter: ({ children }) => children,
      Navigate: () => null,
      Route: ({ element, path }) => <route data-path={path} element={element} />,
      Routes: ({ children }) => {
        const routes = React.Children.toArray(children);
        const matchedRoute =
          routes.find((child) => child.props["data-path"] === "/") ?? routes[0];

        return matchedRoute?.props.element ?? null;
      },
      NavLink: ({ children, to, className, end, ...rest }) => (
        <a href={to} className={resolveClassName(className, to)} {...rest}>
          {children}
        </a>
      ),
      Link: ({ children, to, className, ...rest }) => (
        <a href={to} className={className} {...rest}>
          {children}
        </a>
      ),
      useNavigate: () => jest.fn(),
      useLocation: () => ({ search: "", hash: "", pathname: "/" }),
    };
  },
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

jest.mock("./services/authService", () => {
  const actual = jest.requireActual("./services/authService");

  return {
    ...actual,
    getAllProducts: jest.fn().mockResolvedValue({
      data: {
        products: [],
      },
    }),
    setAuthToken: jest.fn(),
  };
});

jest.mock("./pages/Home", () => () => <div>Home page</div>);

import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders navbar brand", () => {
  render(<App />);
  expect(screen.getAllByText(/farmer marketplace/i).length).toBeGreaterThan(0);
  expect(screen.getAllByRole("link", { name: /login/i }).length).toBeGreaterThan(0);
});
