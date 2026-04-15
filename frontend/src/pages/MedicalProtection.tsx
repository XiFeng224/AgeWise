import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Layout,
  Card,
  Typography,
  Row,
  Col,
  Input,
  Select,
  Tag,
  Spin,
  message,
  Button,
  Space
} from 'antd';
import {
  PlayCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  ClockCircleOutlined,
  UserOutlined,
  HeartOutlined,
  PauseCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import './MedicalProtection.css';

const { Content } = Layout;
const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

interface VideoItem {
  id: string;
  title: string;
  description: string;
  cover: string;
  duration: string;
  views: number;
  likes: number;
  author: string;
  category: string;
  tags: string[];
}

const mockVideos: VideoItem[] = [
  {
    id: '1',
    title: '中国老年人日常防护指南',
    description: '由中国疾控中心专家讲解，详细介绍老年人在日常生活中的防护措施，包括个人卫生、饮食健康等方面的注意事项，符合国内老年人的生活习惯。',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Chinese%20elderly%20health%20protection%20guide%20medical%20video%20cover%20with%20Chinese%20doctor%20and%20elderly%20people&image_size=landscape_16_9',
    duration: '08:45',
    views: 5250,
    likes: 389,
    author: '中国疾控中心',
    category: '日常防护',
    tags: ['日常防护', '个人卫生', '饮食健康', '中国疾控中心']
  },
  {
    id: '2',
    title: '老年人常见疾病预防 - 中国专家解读',
    description: '由北京协和医院专家讲解，针对中国老年人常见疾病的预防方法，包括高血压、糖尿病、心脑血管疾病等的预防措施和饮食调理。',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Chinese%20elderly%20disease%20prevention%20medical%20video%20cover%20with%20Beijing%20Union%20Hospital%20doctor&image_size=landscape_16_9',
    duration: '12:30',
    views: 8100,
    likes: 656,
    author: '北京协和医院',
    category: '疾病预防',
    tags: ['疾病预防', '高血压', '糖尿病', '北京协和医院']
  },
  {
    id: '3',
    title: '老年人急救知识 - 中国红十字会教程',
    description: '中国红十字会官方教程，教授老年人及其家属基本的急救知识，包括心肺复苏、止血、骨折处理等紧急情况的应对方法，符合中国国情。',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Chinese%20elderly%20first%20aid%20knowledge%20Red%20Cross%20video%20cover%20with%20Chinese%20first%20aid%20instructor&image_size=landscape_16_9',
    duration: '15:20',
    views: 6850,
    likes: 534,
    author: '中国红十字会',
    category: '急救知识',
    tags: ['急救知识', '心肺复苏', '止血', '中国红十字会']
  },
  {
    id: '4',
    title: '老年人用药安全 - 中国药学会指南',
    description: '由中国药学会专家讲解，介绍老年人用药的注意事项，包括常用药物的正确服用方法、药物相互作用、副作用的识别等，针对国内常用药物。',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Chinese%20elderly%20medication%20safety%20video%20cover%20with%20Chinese%20pharmacist%20and%20elderly%20patient&image_size=landscape_16_9',
    duration: '10:15',
    views: 7680,
    likes: 412,
    author: '中国药学会',
    category: '用药安全',
    tags: ['用药安全', '药物服用', '副作用', '中国药学会']
  },
  {
    id: '5',
    title: '老年人心理健康 - 北京安定医院指南',
    description: '由北京安定医院心理专家讲解，关注老年人的心理健康，讲解如何预防和应对老年抑郁、焦虑等心理问题，符合中国老年人的心理特点。',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Chinese%20elderly%20mental%20health%20video%20cover%20with%20Beijing%20Anding%20Hospital%20psychologist&image_size=landscape_16_9',
    duration: '14:45',
    views: 5320,
    likes: 398,
    author: '北京安定医院',
    category: '心理健康',
    tags: ['心理健康', '抑郁', '焦虑', '北京安定医院']
  },
  {
    id: '6',
    title: '老年人居家安全 - 中国老龄协会建议',
    description: '中国老龄协会发布的老年人居家安全指南，讲解老年人居家环境的安全隐患及防范措施，包括跌倒预防、火灾防范、煤气安全等，适合中国家庭环境。',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Chinese%20elderly%20home%20safety%20video%20cover%20with%20Chinese%20senior%20citizens%20in%20home%20setting&image_size=landscape_16_9',
    duration: '09:30',
    views: 6450,
    likes: 405,
    author: '中国老龄协会',
    category: '居家安全',
    tags: ['居家安全', '跌倒预防', '火灾防范', '中国老龄协会']
  }
];

const MedicalProtection = () => {
  const [searchText, setSearchText] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedTag, setSelectedTag] = useState('all');
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const allTags = useMemo(() => Array.from(new Set(mockVideos.flatMap((video) => video.tags))), []);
  const categories = useMemo(() => Array.from(new Set(mockVideos.map((video) => video.category))), []);
  const filteredVideos = useMemo(() => {
    let result = mockVideos;

    if (category !== 'all') {
      result = result.filter((video) => video.category === category);
    }

    if (selectedTag !== 'all') {
      result = result.filter((video) => video.tags.includes(selectedTag));
    }

    if (searchText) {
      const lowerSearchText = searchText.toLowerCase();
      result = result.filter(
        (video) =>
          video.title.toLowerCase().includes(lowerSearchText) ||
          video.description.toLowerCase().includes(lowerSearchText)
      );
    }

    return result;
  }, [searchText, category, selectedTag]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleVideoClick = (video: VideoItem) => {
    setActiveVideo(video);
    setPlaying(false);
    message.info(`正在准备播放视频：${video.title}`);
  };

  const handleTogglePlay = async () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
      setPlaying(false);
      return;
    }
    try {
      await videoRef.current.play();
      setPlaying(true);
    } catch {
      message.warning('当前视频暂时无法自动播放，请点击视频区域或检查浏览器设置');
    }
  };

  const handleReloadVideo = () => {
    if (!videoRef.current) return;
    videoRef.current.load();
    setPlaying(false);
  };

  return (
    <Content className="medical-protection-content">
      <div className="medical-protection-header">
        <Title level={2} className="medical-protection-title">
          医疗防护视频
        </Title>
        <Text className="medical-protection-description">
          提供专业的老年人医疗防护知识和技能培训视频
        </Text>
      </div>

      {activeVideo && (
        <Card
          title={`正在播放：${activeVideo.title}`}
          className="medical-protection-player-card"
          extra={
            <Space>
              <Button icon={<ReloadOutlined />} onClick={handleReloadVideo}>重载</Button>
              <Button icon={playing ? <PauseCircleOutlined /> : <PlayCircleOutlined />} onClick={handleTogglePlay}>
                {playing ? '暂停' : '播放'}
              </Button>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Row gutter={16} align="stretch">
            <Col xs={24} lg={16}>
              <div className="medical-video-player-wrap">
                <video
                  ref={videoRef}
                  className="medical-video-player"
                  controls
                  poster={activeVideo.cover}
                  src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
                  autoPlay={false}
                  preload="metadata"
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onEnded={() => setPlaying(false)}
                  onClick={handleTogglePlay}
                />
              </div>
            </Col>
            <Col xs={24} lg={8}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>{activeVideo.description}</Text>
                <Space wrap>
                  <Tag color="blue">{activeVideo.author}</Tag>
                  <Tag color="green">{activeVideo.category}</Tag>
                  <Tag color="processing">{activeVideo.duration}</Tag>
                </Space>
                <Text type="secondary">提示：点击视频播放器即可播放/暂停，也可点击上方按钮控制播放。</Text>
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      <div className="medical-protection-filters">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12} lg={8}>
            <Search
              placeholder="搜索视频"
              allowClear
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="medical-protection-search"
            />
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Select
              placeholder="按分类筛选"
              allowClear
              style={{ width: '100%' }}
              value={category === 'all' ? undefined : category}
              onChange={(value) => setCategory(value || 'all')}
              prefix={<FilterOutlined />}
              className="medical-protection-category"
            >
              <Option value="all">全部分类</Option>
              {categories.map(cat => (
                <Option key={cat} value={cat}>{cat}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Select
              placeholder="按标签筛选"
              allowClear
              style={{ width: '100%' }}
              value={selectedTag === 'all' ? undefined : selectedTag}
              onChange={(value) => setSelectedTag(value || 'all')}
              prefix={<FilterOutlined />}
              className="medical-protection-tag"
            >
              <Option value="all">全部标签</Option>
              {allTags.map(tag => (
                <Option key={tag} value={tag}>{tag}</Option>
              ))}
            </Select>
          </Col>
        </Row>
      </div>

      {loading ? (
        <div className="medical-protection-loading">
          <Spin size="large" />
          <div className="loading-tip">加载视频中...</div>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="medical-protection-empty">
          <Text>未找到符合条件的视频</Text>
        </div>
      ) : (
        <div className="medical-protection-videos">
          <Row gutter={[16, 16]}>
            {filteredVideos.map(video => (
              <Col key={video.id} xs={24} sm={12} md={8} lg={6}>
                <Card
                  hoverable
                  className="medical-protection-video-card"
                  cover={
                    <div className="video-cover-container" onClick={() => handleVideoClick(video)}>
                      <img
                        src={video.cover}
                        alt={video.title}
                        className="video-cover"
                      />
                      <div className="video-overlay">
                        <PlayCircleOutlined className="play-icon" />
                        <div className="video-duration">{video.duration}</div>
                      </div>
                    </div>
                  }
                  onClick={() => handleVideoClick(video)}
                >
                  <Card.Meta
                    title={
                      <div className="video-title">
                        <Text ellipsis strong>{video.title}</Text>
                      </div>
                    }
                    description={
                      <div className="video-info">
                        <Text ellipsis className="video-description">
                          {video.description}
                        </Text>
                        <div className="video-meta">
                          <div className="video-author">
                            <UserOutlined className="meta-icon" />
                            <Text className="small-text">{video.author}</Text>
                          </div>
                          <div className="video-stats">
                            <div className="video-stat">
                              <ClockCircleOutlined className="meta-icon" />
                              <Text className="small-text">{video.views} 次观看</Text>
                            </div>
                            <div className="video-stat">
                              <HeartOutlined className="meta-icon" />
                              <Text className="small-text">{video.likes} 人点赞</Text>
                            </div>
                          </div>
                          <div className="video-tags">
                            {video.tags.map(tag => (
                              <Tag key={tag} className="video-tag">
                                {tag}
                              </Tag>
                            ))}
                          </div>
                        </div>
                      </div>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}
    </Content>
  );
};

export default MedicalProtection;
