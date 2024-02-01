import * as t from '@babel/types';
import {
  bold,
  cyan,
  dim,
  green,
  magenta,
  underline,
  yellow,
} from 'kleur/colors';
import type { NodePath } from '@babel/core';
import type { MillionTelemetry } from 'packages/telemetry';
import type { Options } from '../options';

/**
 * deopt (deoptimize) will turn a block into a regular function call.
 */
export const deopt = (
  message: string | null,
  filename: string,
  callSitePath: NodePath,
  targetPath: NodePath = callSitePath,
): Error => {
  const { parent, node } = callSitePath;
  // This will attempt to reset the variable to the first argument from
  // const foo = block(Component) --> const foo = Component
  if (
    t.isVariableDeclarator(parent) &&
    'arguments' in node &&
    (t.isExpression(node.arguments[0]) || t.isIdentifier(node.arguments[0]))
  ) {
    parent.init = node.arguments[0];
  }
  if (message === null) return new Error('');
  return createErrorMessage(targetPath, message, filename);
};

export const warn = (
  message: string,
  file: string,
  path: NodePath,
  log?: boolean | string | null,
): void => {
  if (log === false) return;
  const err = createErrorMessage(path, message, file);
  // eslint-disable-next-line no-console
  console.warn(
    err.message,
    '\n',
    dim(
      `Check out the Rules of Blocks: ${cyan(
        'https://million.dev/docs/rules',
      )}. Enable the "mute" option to disable this message.`,
    ),
    '\n',
  );
};

export const createErrorMessage = (
  path: NodePath,
  message: string,
  filename: string,
): Error => {
  return path.buildCodeFrameError(
    `\n${magenta('⚠')}${message} ${dim(filename)}`,
  );
};

let hasIntroRan = false;

export const displayIntro = (options: Options): void => {
  if (hasIntroRan) return;
  hasIntroRan = true;

  const experiments: string[] = [];

  if (typeof options.auto === 'object' && options.auto.rsc) {
    experiments.push('auto-rsc');
  }
  if (options.optimize) {
    experiments.push('optimize');
  }

  if (!options.MillionTelemetry) return;
  if (!options.MillionTelemetry.improvementReported()) return;
  const anonymousSessionId = options.MillionTelemetry.anonymousSessionId;


  // FIXME: Need to add million.dev instead of localhost:3000
  let message = `\n  ${bold(
    magenta(`⚡ Million.js ${process.env.VERSION || ''}`),
  )}
  - Tip:     use ${dim('// million-ignore')} for errors
  ${
    anonymousSessionId
      ? `- Wrapped: ${cyan(
          `https://localhost:3000/wrapped/${anonymousSessionId}`,
        )}`
      : ''
  }`;

  if (experiments.length) {
    message += `\n  - Experiments (use at your own risk):
      · ${experiments.join('\n      · ')}
  `;
  }

  // eslint-disable-next-line no-console
  console.log(`${message}\n`);
};

export const catchError = (
  fn: () => void,
  log: boolean | string | undefined | null,
): void => {
  try {
    fn();
  } catch (err: unknown) {
    if (err instanceof Error && err.message && log !== false) {
      // eslint-disable-next-line no-console
      console.warn(err.message, '\n');
    }
  }
};

export const logImprovement = (
  component: string,
  improvement: number,
  stdout: boolean,
  telemetry: MillionTelemetry,
): void => {
  void telemetry.record({
    event: 'improvement',
    payload: { component, improvement },
  });

  const improvementFormatted = isFinite(improvement)
    ? (improvement * 100).toFixed(0)
    : '∞';
  if (stdout) {
    // eslint-disable-next-line no-console
    console.log(
      `${magenta(' ⚡ ')}${yellow(`<${component}>`)} now renders ${green(
        underline(`~${improvementFormatted}%`),
      )} faster`,
    );
  }
};

export const logIgnore = (component: string): void => {
  // eslint-disable-next-line no-console
  console.log(dim(` ○ ${yellow(`<${component}>`)} was ignored`));
};
