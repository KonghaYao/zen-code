import { extract } from './extract';

const testCases = [
    // 注释部分均为测试通过
    // { label: '掘金', url: 'https://juejin.cn/post/7476665749126742025' },
    // { label: 'InfoQ', url: 'https://www.infoq.cn/article/6DxKgF0KO8kgkYh3EIDT' },
    // { label: '微信公众号', url: 'https://mp.weixin.qq.com/s/n_YMqlK6EUbuMSym_Gq4bA' },
    // { label: '博客园', url: 'https://www.cnblogs.com/newbe36524/p/19685138' },
    // { label: '腾讯云开发者社区', url: 'https://cloud.tencent.com/developer/article/2496592' },
    // { label: 'npm', url: 'https://www.npmjs.com/package/@langchain/langgraph' },
    // { label: 'GitHub README', url: 'https://github.com/langchain-ai/langgraphjs' },
    // { label: 'MDN', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise' },
    // {
    //     label: 'Stack Overflow',
    //     url: 'https://stackoverflow.com/questions/14220321/how-do-i-return-the-response-from-an-asynchronous-call',
    // },
    // {
    //     label: 'Dev.to',
    //     url: 'https://dev.to/maame-codes/how-my-illegal-visit-to-tech-show-london-turned-into-a-summer-internship-win-336o',
    // },
    // { label: 'csdn 垃圾库', url: 'https://blog.csdn.net/m0_54132386/article/details/145031465' },
    // { label: '阿里云开发者社区', url: 'https://developer.aliyun.com/article/1630735' },

    // 官方文档
    // { label: 'React 官方文档', url: 'https://react.dev/learn' },
    // { label: 'Vue 官方文档', url: 'https://vuejs.org/guide/introduction.html' },
    // { label: 'TypeScript 手册', url: 'https://www.typescriptlang.org/docs/handbook/2/basic-types.html' },
    // { label: 'Node.js 文档', url: 'https://nodejs.org/docs/latest/api/fs.html' },
    // { label: 'Rust Book', url: 'https://doc.rust-lang.org/book/ch01-01-installation.html' },
    // { label: 'Python 官方文档', url: 'https://docs.python.org/3/library/asyncio.html' },

    // 问答/社区
    // { label: 'Stack Exchange', url: 'https://unix.stackexchange.com/questions/12345/example' },

    // 技术资讯
    // { label: 'TechCrunch', url: 'https://techcrunch.com/2024/01/15/openai-releases-gpt-4' },
    // { label: 'The Verge', url: 'https://www.theverge.com/tech/890785/macbook-neo-slay-spire-2-pokopia-installer' },
    // {
    //     label: 'Wired',
    //     url: 'https://www.wired.com/story/how-each-gulf-country-is-intercepting-iranian-missiles-and-drones/',
    // },
    // { label: '少数派', url: 'https://sspai.com/post/12345' },
    // { label: 'GitLab', url: 'https://gitlab.com/gitlab-org/gitlab' },
    // { label: 'PyPI', url: 'https://pypi.org/project/requests/' },
    // { label: 'OpenAI Blog', url: 'https://openai.com/blog/gpt-4' },
    // {
    //     label: 'github 页面',
    //     url: 'https://github.com/nczitzk/RSSHub/blob/5469b02b2be6fe5d92b653eccc2667e0753749f2/lib/routes/zhihu/utils.ts',
    // },
    // { label: 'Anthropic Docs', url: 'https://www.anthropic.com/research/introspection' },
    // { label: 'LangChain Docs', url: 'https://docs.langchain.com/oss/python/langchain/quickstart' },
    // { label: 'Hugging Face', url: 'https://huggingface.co/blog/llama2' },
    // { label: 'apiyi', url: 'https://docs.apiyi.com/api-capabilities/nano-banana-2-image' },

    // { label: 'Hashnode', url: 'https://hashnode.com/post/understanding-llms-cljt8cl8x000109l42e4p4d8h' },
    // { label: 'LogRocket', url: 'https://blog.logrocket.com/angular-signal-forms/' },
    // { label: 'Smashing Magazine', url: 'https://www.smashingmagazine.com/2025/10/javascript-for-everyone-iterators/' },
    // { label: 'CSS-Tricks', url: 'https://css-tricks.com/a-complete-guide-to-css-media-queries/' },
    // { label: 'freeCodeCamp', url: 'https://www.freecodecamp.org/news/how-to-build-production-ready-voice-agents/' },
    // {
    //     label: 'DigitalOcean Tutorials',
    //     url: 'https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-ubuntu-22-04',
    // },
    // { label: 'Heroku Dev Center', url: 'https://devcenter.heroku.com/articles/getting-started-with-nodejs' },
    // { label: 'JetBrains Blog', url: 'https://blog.jetbrains.com/idea/2024/01/intellij-idea-2024-1/' },
    // { label: 'jsr', url: 'https://jsr.io/@b-fuze/deno-dom' },
    // { label: '百度开发者中心', url: 'https://developer.baidu.com/article/detail.html?id=3547248' },
    // { label: '华为云社区', url: 'https://bbs.huaweicloud.com/blogs/474815' },
    // { label: 'Coursera Blog', url: 'https://www.coursera.org/articles/what-is-machine-learning' },
    // { label: 'LeetCode Discuss', url: 'https://leetcode.com/discuss/general-discussion/1234567' },

    // {
    //     label: 'GeeksforGeeks',
    //     url: 'https://www.geeksforgeeks.org/problems/subarray-with-given-sum-1587115621/1?page=1&sortBy=submissions',
    // },
    // { label: 'W3Schools', url: 'https://www.w3schools.com/js/js_async.asp' },
    // { label: 'Tutorialspoint', url: 'https://www.tutorialspoint.com/machine_learning/index.htm' },
    // { label: 'Indie Hackers', url: 'https://www.indiehackers.com/post/how-i-built-my-saas-123456' },
    // { label: '优设', url: 'https://www.uisdc.com/seedance-2-8' },
    // { label: 'BBC Technology', url: 'https://www.bbc.com/news/technology-67890123' },
    // { label: '飞书', url: 'https://bocha-ai.feishu.cn/wiki/RXEOw02rFiwzGSkd9mUcqoeAnNK' },

    // ==== 完全不行的 ======
    // 不行,反爬 { label: 'SegmentFault', url: 'https://segmentfault.com/q/1010000047638153' },
    // 不行,反爬 { label: 'OSChina', url: 'https://my.oschina.net/alchemystar/blog/4778082' },
    // tavily can { label: 'crates.io', url: 'https://crates.io/crates/serde' },
    // tavily can { label: 'Google Scholar', url: 'https://scholar.google.com/scholar?q=large+language+model' },
    // tavily can { label: 'Reddit', url: 'https://www.reddit.com/r/programming/comments/abc123/example_post' },

    // 不行, 存的都是 pdf { label: 'arXiv', url: 'https://arxiv.org/abs/2301.12345' },
    // 不行,反爬 { label: '知乎', url: 'https://zhuanlan.zhihu.com/p/1903918374834124458' },

    // 更多技术博客/平台

    // 学术/论文
    // 不行 {
    //     label: 'Semantic Scholar',
    //     url: 'https://www.semanticscholar.org/paper/Attention-Is-All-You-Need-Vaswani-Shazeer/204e3073870fae3d05bcbc2f6a8e263d9b72e776',
    // },
    // 不行 { label: 'Papers With Code', url: 'https://paperswithcode.com/paper/attention-is-all-you-need' },
    // 不行 { label: 'Google Patents', url: 'https://patents.google.com/patent/US20240000001A1/en' },

    // 新闻媒体

    // tavily can { label: '路透社', url: 'https://www.reuters.com/technology/artificial-intelligence/' },
    // tavily can { label: 'Bloomberg Tech', url: 'https://www.bloomberg.com/technology' },

    // 中文平台补充

    // 设计/产品
    // no { label: 'Dribbble', url: 'https://dribbble.com/shots/12345678-Example-Design' },
    // 不行 { label: 'Behance', url: 'https://www.behance.net/gallery/123456787/Example-Project' },
    // 不行 { label: 'Product Hunt', url: 'https://www.producthunt.com/categories/ai-coding-agents' },
    // 不行 { label: 'Figma Community', url: 'https://www.figma.com/community/file/12345678' },

    // 其他

    // tavily can  { label: 'Hacker News', url: 'https://news.ycombinator.com/newest' },
    // 不行 {
    //     label: 'Medium',
    //     url: 'https://razeenk.medium.com/how-large-language-models-llms-work-a-deep-dive-53c635052dbe',
    // },

    // 不行 { label: 'Quora', url: 'https://www.quora.com/What-is-a-large-language-model' },
    { label: 'Docker Hub', url: 'https://hub.docker.com/r/oven/bun' },
    { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Large_language_model' },
];

for (const { label, url } of testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[${label}] ${url}`);
    console.log('='.repeat(60));
    try {
        const response = await extract({
            urls: [url],
            include_images: false,
            include_favicon: false,
            extract_depth: 'basic',
            format: 'markdown',
        });
        if (response.results.length > 0) {
            const { raw_content } = response.results[0];
            console.log('内容预览:\n', raw_content?.slice(0, 500));
        } else {
            console.log('失败:', response.failed_results[0]?.error);
        }
    } catch (e) {
        console.error('异常:', e);
    }
}
