import MarkdownRenderer from 'ink-markdown-es';
import { SimpleMarkdown } from './SimpleMarkdown';

export default (props: { children: string; simple: boolean }) => {
    // if (props.simple) {
    return <SimpleMarkdown>{props.children}</SimpleMarkdown>;
    // }

    // return <MarkdownRenderer>{props.children}</MarkdownRenderer>;
};
