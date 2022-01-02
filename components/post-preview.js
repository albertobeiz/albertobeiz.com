import DateFormatter from '../components/date-formatter';
import Link from 'next/link';
import Image from 'next/image';

export default function PostPreview({ title, date, slug, coverImage }) {
  return (
    <div className="flex space-x-4">
      <div>
        <Image src={coverImage} width={50} height={50}></Image>
      </div>
      <div>
        <h3 className="text-xl mb-1">
          <Link as={`/posts/${slug}`} href="/posts/[slug]">
            <a className="hover:underline">{title}</a>
          </Link>
        </h3>
        <div className="text-sm mb-4 text-gray-600">
          <DateFormatter dateString={date} />
        </div>
      </div>
    </div>
  );
}
