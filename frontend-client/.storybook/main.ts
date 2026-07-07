import type { StorybookConfig } from "@storybook/react-webpack5";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

const config: StorybookConfig = {
  stories: ["../components/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/react-webpack5",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
  webpackFinal: async (config) => {
    config.resolve = config.resolve || {};
    config.resolve.extensions = Array.from(new Set([...(config.resolve.extensions ?? []), ".ts", ".tsx"]));

    if (config.module?.rules) {
      config.module.rules = config.module.rules.filter((rule) => {
        if (!rule || typeof rule !== "object" || !("test" in rule)) return true;
        const test = rule.test;
        return !(test instanceof RegExp && test.test("app.css"));
      });
    }

    config.module?.rules?.push({
      test: /\.[tj]sx?$/,
      exclude: /node_modules/,
      use: {
        loader: "babel-loader",
        options: {
          presets: ["next/babel"],
        },
      },
    });

    // Add Tailwind CSS support
    config.module?.rules?.push({
      test: /\.css$/,
      use: [
        "style-loader",
        "css-loader",
        {
          loader: "postcss-loader",
          options: {
            postcssOptions: {
              plugins: [tailwindcss, autoprefixer],
            },
          },
        },
      ],
    });
    return config;
  },
};

export default config;
