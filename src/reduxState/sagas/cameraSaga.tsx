import React from 'react';
import { select, takeEvery, call } from 'redux-saga/effects';
import actions from 'reduxState/actions';
import { post } from 'utils/request';
import { Alert, Text } from 'react-native';
import { showLoadingModal, closeLoadingModal, showImageResultDialog } from 'components/Dialog';
import { selectLocation } from 'reduxState/selectors';
import { Location } from 'types/types';
import pickImage from 'utils/pickImage';

export function* watchShowCameraOptions() {
  yield takeEvery(actions.showCameraOptions, showCameraOptions);
}

function* showCameraOptions() {
  const { lon, lat }: Location = yield select(selectLocation);
  yield call(recognizeImage,lon, lat);
}

async function recognizeImage(lon: number, lat: number) {
  const pic = await pickImage();
  if (!pic) {
    return;
  }
  const formData = new FormData();
  formData.append('file', {
    uri: pic.path,
    type: pic.mime,
    name: `file.jpg`,
  });
  showLoadingModal('正在上传...');
  const { ok, data: fileId } = await post('/file', formData, {
    timeout: 30000,
  });
  closeLoadingModal();
  if (!ok) {
    return Alert.alert('上传失败，请重试');
  }
  if (fileId) {
    showLoadingModal('正在识别...');
    const {
      data: {
        extra: { name, score, baike_info = {} },
      },
    } = await post(`/report`, {
      type: 'plant',
      desc: '',
      image: fileId,
      lon,
      lat,
    });
    closeLoadingModal();
    // {"name": "非动物", "score": "0.999804", "baike_info": {}}
    showImageResultDialog({
      name,
      imageUri: { uri: baike_info.image_url },
      webUri: baike_info.baike_url,
      content: <Text style={{ marginBottom: 10 }}>可信度: {score}</Text>,
    });
  }
}
