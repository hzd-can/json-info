import logo from './logo.ico';
import './App.css';

import React, { Component } from 'react';
import QRCode from 'qrcode.react';
import clipboardCopy from 'clipboard-copy';

// 事件总线类
class EventBus {
  constructor() {
    this.listeners = {};
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }
}

// 创建一个事件总线实例
const eventBus = new EventBus();
class JsonTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      pageWidth : {},
      collapsed: {}, // 保存每个属性的折叠状态
      visabled: {},
    };
  }

  toggleCollapse = (key) => {
    this.setState((prevState) => {
      const isCollapsed = prevState.collapsed[key] === undefined ? !this.props.collapsed : !prevState.collapsed[key];
      return {
        collapsed: {
          ...prevState.collapsed,
          [key]: isCollapsed,
        },
      };
    });
  };

  setVisable = (key) => {
    this.setState((prevState) => {
      const isVisable = prevState.visabled[key] === undefined ? !this.props.visabled : !prevState.visabled[key];
      return {
        visabled: {
          ...prevState.visabled,
          [key]: isVisable,
        },
      };
    });
  };

  renderRow = (key, value) => {
    const { collapsed } = this.state;

    if (typeof value === 'object' && value !== null) {
      const isCollapsed = collapsed[key] === undefined ? this.props.collapsed : collapsed[key];
      return (
        <tr key={key}>
          <td style={{...cellStyle, width: '0px', whiteSpace: 'nowrap'}}>{key}</td>
          <td>
            <button onClick={() => this.toggleCollapse(key)}>
              {isCollapsed ? '+' : '-'}
            </button>
            {isCollapsed ? <div style={objectCellStyle}>{JSON.stringify(value)}</div> : <JsonTable data={value} collapsed={this.props.collapsed} />}
          </td>
        </tr>
      );
    } else {
      return (
        <tr key={key}>
          <td style={{...cellStyle, width: '0px', whiteSpace: 'nowrap'}}>{key}</td>
          <td style={{...getValueStyle(value), ...cellValueStyle}}>{getValuePrint(value)}</td>
        </tr>
      );
    }
  };

  handleWidthChange = (key, event) => {
    this.setState((prevState) => {
      const newWidth = event.target.value + '%';
      return {
        pageWidth:{
          ...prevState.pageWidth,
          [key]: newWidth,
        }
      }
    });
  };

  renderRow = (key, value, columnWidth) => {
    const { visabled, pageWidth, collapsed } = this.state;
    if (typeof value === 'object' && value !== null) {
      const isCollapsed = collapsed[key] === undefined ? this.props.collapsed : collapsed[key];
      const iPageWidth = pageWidth[key] === undefined ? '100%' : pageWidth[key];
      const isVisabled = visabled[key] === undefined ? this.props.visabled : visabled[key];

      if(this.props.col || Array.isArray(value)){
        eventBus.on('resetSignal', (key) => {
          this.setState({ [key]: {}});
        });

        return (
          <tr key={key}>
            <td style={cellStyle}>{key}</td>
            <table style={{...tableStyle, width: iPageWidth}} key={key} >
            <td style={{ whiteSpace: 'nowrap' }}>
              <button onClick={() => this.toggleCollapse(key)}>{isCollapsed ? '▼' : '▶'}</button>
              <button onClick={() => this.setVisable(key)}>{isVisabled ? '+' : '-'}</button>
              <button onClick={() => handleCopyClick(value)}>Copy</button>
              <input type="range" id={key} min="100" max="400" value={parseInt(iPageWidth)} onChange={(event)=>this.handleWidthChange(key, event)}/>
              {isVisabled ? <div></div> : <JsonTable data={value} collapsed={this.props.collapsed} col={isCollapsed} visabled={isVisabled} />}

            </td>
          </table>
          </tr>
        );
      }
      else{
        return (
          <td style={{width: columnWidth}} key={key}>
            <table style={{...tableStyle, width: iPageWidth}}>
              <tr style={cellStyle}>{key}</tr>
              <tr style={{width: '0%'}}>
                <button onClick={() => this.toggleCollapse(key)}> {isCollapsed ? '▼' : '▶'}</button>
                <button onClick={() => this.setVisable(key)}>{isVisabled ? '+' : '-'}</button>
                <button onClick={() => handleCopyClick(value)}>Copy</button>
                <input type="range" id={key} min="100" max="400" value={parseInt(iPageWidth)} onChange={(event)=>this.handleWidthChange(key, event)}/>
              </tr>
              <tr>
                {isVisabled ? <div></div> : <JsonTable data={value} collapsed={this.props.collapsed} col={isCollapsed}  visabled={isVisabled}/>}
              </tr>
            </table>
          </td>
        );        
      }
    } else {
        if(this.props.col){
          return (
          <tr key={key} style={{width: '0%'}}>
            <td style={cellStyle}>{key}</td>
            <td style={{...getValueStyle(value), ...cellValueStyle}}>{getValuePrint(value)}</td>
          </tr>);
        }
        else {
          return (
            <td style={{width: columnWidth}} key={key}>
            <table style={{...tableStyle}}>
              <tr style={cellStyle}>{key}</tr>
              <tr style={{...getValueStyle(value), ...cellValueStyle}}>{getValuePrint(value)}</tr>
              </table>
          </td>);
        }
    }
  };

  render() {
    const { data } = this.props;

    const columnWidth = 100 / Object.keys(data).length + '%';

    return (
      <table style={{...tableStyle1}}>
        <tbody>
          {Object.keys(data).map((key) => this.renderRow(key, data[key], columnWidth))}
        </tbody>
      </table>
    );
  }
}

const getValueStyle = (value) => {
  if (typeof value === 'string') {
    return { color: 'orange' };
  } else if (typeof value === 'number') {
    return { color: 'blue' };
  } else if (value === null) {
    return { color: 'black' };
  } else if (typeof value === 'boolean') {
    if(value)
      return { color: 'green' };
    else
      return { color: 'red' };
  }
  return {}; // 默认样式
};

const getValuePrint = (value) => {
  if (typeof value === 'number' && value % 1 !== 0) {
    return  value.toFixed(3);
  } else if (value === null) {
    return "null";
  } else if (typeof value === 'boolean') {
    if(value)
      return "true";
    else
     return "false";
  }
  return value
};

const handleCopyClick = (data) => {
  clipboardCopy(JSON.stringify(data, null, 2));
  alert('复制的内容\n' + JSON.stringify(data, null, 2));
};

const objectCellStyle = {
  border: '1px solid #ddd',
  padding: '8px',
  textAlign: 'left',
  backgroundColor: '#fff', // Optional: Set background color for object content
  whiteSpace: 'nowrap', // Prevent object content from wrapping
  overflow: 'hidden', // Hide any overflow
  textOverflow: 'ellipsis', // Display ellipsis if content is too long
};

const tableStyle1 = {
  borderCollapse: 'collapse',
  width: '100%',
  border: '1px solid #ddd',
};

const tableStyle = {
  borderCollapse: 'collapse',
  width: '100%',
  border: '0px solid #ddd',
};

const cellStyle = {
  width: '1px', 
  whiteSpace: 'nowrap',
  border: '1px solid #ddd',
  padding: '8px',
  textAlign: 'left',
  backgroundColor: '#f2f2f2',
};

const cellValueStyle = {
  whiteSpace: 'nowrap',
  border: '1px solid #ddd',
  padding: '8px',
  textAlign: 'left',
};

const barcodeContainerStyle = {
  flex: 1,
  textAlign: 'right',
};

const pageStyle = {
  width: '200%', // 设置页面宽度为200%
};

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isVisabled: true,
      serverIp: window.location.href,
      pageWidth: '100%',
      online: true,
      collapsed: this.checkIsMobile(),
      data: [{
        状态: null,
      }]
    };
  }

  componentDidMount() {
    document.title = window.location.hostname;
    this.fetchData(); // Fetch data immediately
    this.fetchServerIp();
    this.dataInterval = setInterval(this.fetchData, 1000);
  }

  componentWillUnmount() {
    clearInterval(this.dataInterval);
  }

  fetchData = () => {
    // Replace this with your actual API call
    fetch('/json')
      .then(response => response.json())
      .then(data => {
        this.setState({
          online: true,
          data: data,
        });
      })
      .catch(error => {
        this.setState({
          online: false,
        });
        console.error('Error fetching data:', error);
      });
  };

  toggleCollapse = () => {
    eventBus.emit('resetSignal', 'collapsed');
    this.setState((prevState) => {
      return {
        collapsed: !prevState.collapsed,
      };
    });
  };

  handleWidthChange = (event) => {
    const newWidth = event.target.value + '%';
    this.setState({
      pageWidth: newWidth,
    });
  };

  checkIsMobile() {
    const userAgent = navigator.userAgent;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  }

  fetchServerIp = () => {
    fetch('/getServerIp') // 发送请求到后端 API
      .then((response) => response.json())
      .then((data) => {
        this.setState({ serverIp: 'http://' + `${data.ip}:${data.port}` });
      })
      .catch((error) => {
        console.error('Error fetching server IP:', error);
      });
  };

  setVisable = () => {
    eventBus.emit('resetSignal', 'visabled');
    this.setState((prevState) => {
      const isVisable = !prevState.visabled;
      return {
        visabled: isVisable,
      };
    });
  };

  render() {
    const { visabled, serverIp, pageWidth, online, collapsed, data } = this.state;

    const pageStyle = {
      width: pageWidth, // 使用状态中的宽度值
    };

    return (
      <div>
        <div>
        </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src={logo} alt="Logo" />
            <h1>实时状态({window.location.hostname}{online ? '在线' : '离线'})</h1>
          </div>
          <button onClick={this.toggleCollapse}> {collapsed ? '▼' : '▶'}</button>
          <button onClick={() => this.setVisable()}>{visabled ? '+' : '-'}</button>
          <button onClick={() => handleCopyClick(data)}>Copy</button>
          <input type="range" id="widthControl" min="100" max="400" value={parseInt(pageWidth)} onChange={this.handleWidthChange}/>
        <div style={pageStyle}>
          <JsonTable data={data} collapsed={collapsed} col={collapsed || Array.isArray(data)} visabled={visabled} />
        </div>
        <div style={barcodeContainerStyle}>
            <p><a href={serverIp} target="_blank" rel="noopener noreferrer">{serverIp}</a></p>
            <QRCode value={serverIp} />
        </div>
      </div>
    );
  }
}

export default App;
